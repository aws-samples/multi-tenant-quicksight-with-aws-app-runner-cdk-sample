import * as AWS from 'aws-sdk'

const AWS_ACCOUNT_ID = process.env.AWS_ACCOUNT_ID as string
const AWS_REGION = process.env.AWS_REGION as string
const TEMPLATE_ID = process.env.TEMPLATE_ID as string
const TEMPLATE_DATASET_PLACEHOLDER = process.env
  .TEMPLATE_DATASET_PLACEHOLDER as string
const TEMPLATE_SOURCE_ANALYSIS_ID = process.env
  .TEMPLATE_SOURCE_ANALYSIS_ID as string
const TEMPLATE_SOURCE_DATASET_ID = process.env
  .TEMPLATE_SOURCE_DATASET_ID as string
const NAMESPACE = process.env.NAMESPACE as string

const quicksight = new AWS.QuickSight({
  apiVersion: '2018-04-01',
  region: AWS_REGION
})

const main = async () => {
  const updateTemplate = await quicksight
    .updateTemplate({
      AwsAccountId: AWS_ACCOUNT_ID,
      TemplateId: TEMPLATE_ID,
      SourceEntity: {
        SourceAnalysis: {
          Arn: `arn:aws:quicksight:${AWS_REGION}:${AWS_ACCOUNT_ID}:analysis/${TEMPLATE_SOURCE_ANALYSIS_ID}`,
          DataSetReferences: [
            {
              DataSetPlaceholder: TEMPLATE_DATASET_PLACEHOLDER,
              DataSetArn: `arn:aws:quicksight:${AWS_REGION}:${AWS_ACCOUNT_ID}:dataset/${TEMPLATE_SOURCE_DATASET_ID}`
            }
          ]
        }
      }
    })
    .promise()

  console.log('updateTemplate:', updateTemplate)

  const describeTemplate = await quicksight
    .describeTemplate({
      AwsAccountId: AWS_ACCOUNT_ID,
      TemplateId: TEMPLATE_ID
    })
    .promise()

  console.log('describeTemplate:', describeTemplate)

  const updateDashboard = await quicksight
    .updateDashboard({
      AwsAccountId: AWS_ACCOUNT_ID,
      DashboardId: NAMESPACE,
      Name: NAMESPACE,
      SourceEntity: {
        SourceTemplate: {
          DataSetReferences: [
            {
              DataSetPlaceholder: TEMPLATE_DATASET_PLACEHOLDER,
              DataSetArn: `arn:aws:quicksight:${AWS_REGION}:${AWS_ACCOUNT_ID}:dataset/${NAMESPACE}`
            }
          ],
          Arn: `arn:aws:quicksight:${AWS_REGION}:${AWS_ACCOUNT_ID}:template/${TEMPLATE_ID}`
        }
      },
      DashboardPublishOptions: {
        AdHocFilteringOption: {
          AvailabilityStatus: 'DISABLED'
        },
        ExportToCSVOption: {
          AvailabilityStatus: 'DISABLED'
        },
        SheetControlsOption: {
          VisibilityState: 'COLLAPSED' // or EXPANDED
        }
      }
    })
    .promise()

  console.log('updateDashboard:', updateDashboard)

  const updateDashboardPublishedVersion = await quicksight
    .updateDashboardPublishedVersion({
      AwsAccountId: AWS_ACCOUNT_ID,
      DashboardId: NAMESPACE,
      VersionNumber: parseInt(
        String(updateDashboard.VersionArn?.split('/').pop()),
        10
      )
    })
    .promise()

  console.log(
    'updateDashboardPublishedVersion:',
    updateDashboardPublishedVersion
  )
}

main()
