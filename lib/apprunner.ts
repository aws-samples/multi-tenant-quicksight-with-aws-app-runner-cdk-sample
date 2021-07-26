import * as path from 'path'
import * as cdk from '@aws-cdk/core'
import * as apprunner from '@aws-cdk/aws-apprunner'
import * as iam from '@aws-cdk/aws-iam'

export class AppRunnerStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    const image = this.synthesizer.addDockerImageAsset({
      directoryName: path.join(__dirname, '..', 'docker'),
      repositoryName: 'multi-tenant-quicksight-app-runner-sample-cdk-image',
      sourceHash: Date.now() + ''
    })

    // Create an IAM role to fetch container
    // https://docs.aws.amazon.com/ja_jp/apprunner/latest/dg/security_iam_service-with-iam.html
    const accessRole = new iam.Role(this, `${id}-iam-build-role`, {
      assumedBy: new iam.ServicePrincipal('build.apprunner.amazonaws.com')
    })
    accessRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'ecr:BatchCheckLayerAvailability',
          'ecr:BatchGetImage',
          'ecr:DescribeImages',
          'ecr:GetAuthorizationToken',
          'ecr:GetDownloadUrlForLayer'
        ],
        resources: ['*']
      })
    )

    // Create an IAM role that container assumes
    // https://docs.aws.amazon.com/ja_jp/apprunner/latest/dg/security_iam_service-with-iam.html
    const instanceRole = new iam.Role(this, `${id}-iam-task-role`, {
      assumedBy: new iam.ServicePrincipal('tasks.apprunner.amazonaws.com')
    })
    instanceRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'ds:AuthorizeApplication',
          'ds:UnauthorizeApplication',
          'ds:CreateIdentityPoolDirectory',
          'ds:DescribeDirectories',
          'quicksight:CreateNamespace',
          'quicksight:ListGroupMemberships',
          'quicksight:CreateGroupMembership',
          'quicksight:DeleteGroupMembership',
          'quicksight:RegisterUser',
          'quicksight:ListNamespaces',
          'quicksight:CreateDataSet',
          'quicksight:CreateGroup',
          'quicksight:PassDataSource',
          'quicksight:CreateDashboard',
          'quicksight:DescribeTemplate',
          'quicksight:PassDataSet',
          'quicksight:DeleteNamespace',
          'quicksight:DeleteDataSet',
          'quicksight:DeleteUser',
          'quicksight:DeleteDashboard',
          'quicksight:DescribeNamespace',
          'quicksight:GetDashboardEmbedUrl',
          'quicksight:GetAuthCode'
        ],
        resources: ['*']
      })
    )

    // Read the parameters at cdk.json
    const allowIpRange = this.node.tryGetContext('appRunnerStack').allowIpRange
    const dummyEmail = this.node.tryGetContext('appRunnerStack').dummyEmail
    const quicksightAdminUserName =
      this.node.tryGetContext('appRunnerStack').quicksightAdminUserName
    const datasourceId = this.node.tryGetContext('appRunnerStack').datasourceId
    const templateId = this.node.tryGetContext('appRunnerStack').templateId
    const templateDatasetPlaceholder =
      this.node.tryGetContext('appRunnerStack').templateDatasetPlaceholder
    const databaseName = this.node.tryGetContext('appRunnerStack').databaseName
    const tableName = this.node.tryGetContext('appRunnerStack').tableName
    const filterColumnName =
      this.node.tryGetContext('appRunnerStack').filterColumnName

    const runtimeEnv = {
      ALLOW_IP_RANGE: allowIpRange,
      AWS_REGION: this.region,
      AWS_ACCOUNT_ID: this.account,
      DUMMY_EMAIL: dummyEmail,
      QUICKSIGHT_ADMIN_USER_NAME: quicksightAdminUserName,
      TEMPLATE_ID: templateId,
      TEMPLATE_DATASET_PLACEHOLDER: templateDatasetPlaceholder,
      DATASOURCE_ID: datasourceId,
      DATABASE_NAME: databaseName,
      TABLE_NAME: tableName,
      FILTER_COLUMN_NAME: filterColumnName
    }

    // Deploy App Runner
    const app = new apprunner.CfnService(this, `${id}-apprunner`, {
      instanceConfiguration: {
        instanceRoleArn: instanceRole.roleArn
      },
      healthCheckConfiguration: {
        path: '/status',
        protocol: 'HTTP'
      },
      sourceConfiguration: {
        authenticationConfiguration: {
          accessRoleArn: accessRole.roleArn
        },
        autoDeploymentsEnabled: true,
        imageRepository: {
          imageIdentifier: image.imageUri,
          imageRepositoryType: 'ECR',
          imageConfiguration: {
            port: '8080',
            runtimeEnvironmentVariables: Object.entries(runtimeEnv).map(
              (env) => {
                return { name: env[0], value: env[1] }
              }
            )
          }
        }
      }
    })

    new cdk.CfnOutput(this, `${id}-image-uri`, {
      value: `${image.imageUri}`
    })

    new cdk.CfnOutput(this, `${id}-app-runner-uri`, {
      value: `https://${app.attrServiceUrl}`
    })
  }
}
