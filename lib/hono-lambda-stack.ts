import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as ssm from "aws-cdk-lib/aws-ssm";
import { CachePolicy, LambdaEdgeEventType } from "aws-cdk-lib/aws-cloudfront";
import {
  AwsCustomResource,
  AwsCustomResourcePolicy,
  PhysicalResourceId,
} from "aws-cdk-lib/custom-resources";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as dotenv from "dotenv";

dotenv.config();

export class HonoLambdaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const API_KEY = process.env.API_KEY as string;


    // Lambda関数（Hono）
    const honoLambda = new NodejsFunction(this, "lambda", {
      entry: "lambda/index.ts",
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_20_X,
      environment: {
        API_KEY: API_KEY,
      },
    });

    // CloudFront Distribution
    const distribution = new cdk.aws_cloudfront.Distribution(this, "Sample", {
      defaultBehavior: {
        origin: new cdk.aws_cloudfront_origins.FunctionUrlOrigin(
          honoLambda.addFunctionUrl({
            authType: cdk.aws_lambda.FunctionUrlAuthType.AWS_IAM,
          })
        ),
        allowedMethods: cdk.aws_cloudfront.AllowedMethods.ALLOW_ALL,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        originRequestPolicy:
          cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
        viewerProtocolPolicy:
          cdk.aws_cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        responseHeadersPolicy:
          cdk.aws_cloudfront.ResponseHeadersPolicy.SECURITY_HEADERS,
        edgeLambdas: [
          {
            eventType: LambdaEdgeEventType.ORIGIN_REQUEST,
            functionVersion: cdk.aws_lambda.Version.fromVersionArn(
              this,
              "OriginRequestWithPostPutFn",
              this.getLambdaEdgeArn("/my-app/lambda-edge-function-arn")
            ),
            includeBody: true,
          },
        ],
      },
      httpVersion: cdk.aws_cloudfront.HttpVersion.HTTP2_AND_3,
      priceClass: cdk.aws_cloudfront.PriceClass.PRICE_CLASS_200,
    });

    // OAC
    const cfnOriginAccessControl =
      new cdk.aws_cloudfront.CfnOriginAccessControl(
        this,
        "OriginAccessControl",
        {
          originAccessControlConfig: {
            name: "Origin Access Control for Lambda Functions URL",
            originAccessControlOriginType: "lambda",
            signingBehavior: "always",
            signingProtocol: "sigv4",
          },
        }
      );

    const cfnDistribution = distribution.node
      .defaultChild as cdk.aws_cloudfront.CfnDistribution;

    // Set OAC
    cfnDistribution.addPropertyOverride(
      "DistributionConfig.Origins.0.OriginAccessControlId",
      cfnOriginAccessControl.attrId
    );

    honoLambda.addPermission("AllowCloudFrontServicePrincipal", {
      principal: new cdk.aws_iam.ServicePrincipal("cloudfront.amazonaws.com"),
      action: "lambda:InvokeFunctionUrl",
      sourceArn: `arn:aws:cloudfront::${
        cdk.Stack.of(this).account
      }:distribution/${distribution.distributionId}`,
    });

    // DynamoDB テーブルの作成
    const todoTable = new dynamodb.Table(this, "TodoTable", {
      tableName: "Todos",
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PROVISIONED,
      readCapacity: 1,
      writeCapacity: 1,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    todoTable.grantReadWriteData(honoLambda);
  }

  // 別リージョンのLambda関数ARNを取得する関数
  getLambdaEdgeArn(lambdaArnParamKey: string): string {
    const lambdaEdgeArnParameter = new AwsCustomResource(
      this,
      "LambdaEdgeCustomResource",
      {
        policy: AwsCustomResourcePolicy.fromStatements([
          new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ["ssm:GetParameter*"],
            resources: [
              this.formatArn({
                service: "ssm",
                region: "us-east-1",
                resource: "*",
              }),
            ],
          }),
        ]),
        onUpdate: {
          service: "SSM",
          action: "getParameter",
          parameters: { Name: lambdaArnParamKey },
          physicalResourceId: PhysicalResourceId.of(
            `PhysicalResourceId-${Date.now()}`
          ),
          region: "us-east-1",
        },
      }
    );
    return lambdaEdgeArnParameter.getResponseField("Parameter.Value");
  }
}
