#!/usr/bin/env node
import 'source-map-support/register'
import * as cdk from '@aws-cdk/core'
import { AppRunnerStack } from '../lib/apprunner'

const app = new cdk.App()

new AppRunnerStack(app, 'AppRunnerStack')
