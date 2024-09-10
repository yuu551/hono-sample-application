import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';

export class LambdaEdgeStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const lambdaEdgeFunction = new NodejsFunction(this, "LambdaEdgeFunction", {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: "lambda-edge/calculateContentHash.ts",
      handler: "handler",
      memorySize: 1769,
      timeout: cdk.Duration.seconds(5),
      functionName: 'my-lambda-edge-function',
      role: new iam.Role(this, "LambdaEdgeFunctionRole", {
        assumedBy: new iam.CompositePrincipal(
          new iam.ServicePrincipal("lambda.amazonaws.com"),
          new iam.ServicePrincipal("edgelambda.amazonaws.com")
        ),
        managedPolicies: [
          iam.ManagedPolicy.fromAwsManagedPolicyName(
            "service-role/AWSLambdaBasicExecutionRole"
          ),
          iam.ManagedPolicy.fromAwsManagedPolicyName("AWSLambda_FullAccess"),
        ],
      }),
    });

    const version = lambdaEdgeFunction.currentVersion;

    // SSM Parameter Store に Lambda@Edge 関数の ARN を保存
    new ssm.StringParameter(this, 'LambdaEdgeFunctionArn', {
      parameterName: '/my-app/lambda-edge-function-arn',
      stringValue: version.functionArn,
    });
  }
}