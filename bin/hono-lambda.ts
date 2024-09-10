#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { HonoLambdaStack } from "../lib/hono-lambda-stack";
import { LambdaEdgeStack } from "../lib/lambda-edge-stack";

const app = new cdk.App();
const lambdaEdgeStack = new LambdaEdgeStack(app, "LambdaEdgeStack", {
  env: { region: "us-east-1" },
});
new HonoLambdaStack(app, "HonoLambdaStack", {
  env: { region: "ap-northeast-1" },
}).addDependency(lambdaEdgeStack);
