import * as AWS from 'aws-sdk'
import * as uuid from 'uuid'
import * as express from 'express'

const AWS_ACCOUNT_ID = process.env.AWS_ACCOUNT_ID as string
const AWS_REGION = process.env.AWS_REGION as string
const QUICKSIGHT_ADMIN_USER_NAME = process.env
  .QUICKSIGHT_ADMIN_USER_NAME as string
const TEMPLATE_ID = process.env.TEMPLATE_ID as string
const TEMPLATE_DATASET_PLACEHOLDER = process.env
  .TEMPLATE_DATASET_PLACEHOLDER as string
const DATASOURCE_ID = process.env.DATASOURCE_ID as string
const DATABASE_NAME = process.env.DATABASE_NAME as string
const TABLE_NAME = process.env.TABLE_NAME as string
const FILTER_COLUMN_NAME = process.env.FILTER_COLUMN_NAME as string

const sleep = (ms: number) => new Promise((cb) => setTimeout(cb, ms, null))

const quicksight = new AWS.QuickSight({
  apiVersion: '2018-04-01',
  region: AWS_REGION
})

const listNamespaces = async (req: express.Request, res: express.Response) => {
  try {
    const listNamespaces = await quicksight
      .listNamespaces({
        AwsAccountId: AWS_ACCOUNT_ID,
        MaxResults: 100
      })
      .promise()

    console.log('listNamespaces:', listNamespaces)

    res.status(200).json(listNamespaces)
  } catch (err) {
    console.log(err)
    res.status(500).send(err.message)
  }
}

const deleteNamespace = async (req: express.Request, res: express.Response) => {
  try {
    const namespaceId = req.params.namespaceId

    const deleteDashboard = await quicksight
      .deleteDashboard({
        AwsAccountId: AWS_ACCOUNT_ID,
        DashboardId: namespaceId
      })
      .promise()

    console.log('deleteDashboard:', deleteDashboard)

    const deleteDataSet = await quicksight
      .deleteDataSet({
        AwsAccountId: AWS_ACCOUNT_ID,
        DataSetId: namespaceId
      })
      .promise()

    console.log('deleteDataSet:', deleteDataSet)

    const deleteNamespace = await quicksight
      .deleteNamespace({
        AwsAccountId: AWS_ACCOUNT_ID,
        Namespace: namespaceId
      })
      .promise()

    console.log('deleteNamespace:', deleteNamespace)

    res.status(200).send('ok')
  } catch (err) {
    console.log(err)
    res.status(500).send(err.message)
  }
}

const addNamespace = async (req: express.Request, res: express.Response) => {
  try {
    const namespaceId = req.body.namespaceId || ''
    const namespaceFilterId = req.body.namespaceFilterId || ''

    if (
      /^[0-9a-zA-Z\-_]+$/.test(namespaceId) === false ||
      /^[0-9a-zA-Z\-_]+$/.test(namespaceFilterId) === false
    ) {
      res.status(400).send('invalid arguments')
      return
    }

    const createNamespace = await quicksight
      .createNamespace({
        AwsAccountId: AWS_ACCOUNT_ID,
        IdentityStore: 'QUICKSIGHT',
        Namespace: namespaceId
      })
      .promise()

    console.log('createNamespace:', createNamespace)

    // Wait for createNamespace to be completed
    let creationStatus = ''
    for (let i = 0; i < 30; i++) {
      await sleep(3000)

      const describeNamespace = await quicksight
        .describeNamespace({
          AwsAccountId: AWS_ACCOUNT_ID,
          Namespace: namespaceId
        })
        .promise()
      console.log('describeNamespace:', describeNamespace)
      creationStatus = describeNamespace.Namespace?.CreationStatus || ''

      if (creationStatus === 'CREATED') {
        break
      }
    }

    if (creationStatus !== 'CREATED') {
      throw new Error('faild to createNamespace')
    }

    const createGroup = await quicksight
      .createGroup({
        AwsAccountId: AWS_ACCOUNT_ID,
        GroupName: 'all-users',
        Namespace: namespaceId
      })
      .promise()

    console.log('createGroup:', createGroup)

    const physicalTableMapId = uuid.v4()
    const logicalTableMap = uuid.v4()

    const createDataSet = await quicksight
      .createDataSet({
        AwsAccountId: AWS_ACCOUNT_ID,
        DataSetId: namespaceId,
        ImportMode: 'DIRECT_QUERY', // or SPICE
        Name: namespaceId,
        PhysicalTableMap: {
          [physicalTableMapId]: {
            CustomSql: {
              DataSourceArn: `arn:aws:quicksight:${AWS_REGION}:${AWS_ACCOUNT_ID}:datasource/${DATASOURCE_ID}`,
              Name: 'CustomQuery',
              SqlQuery: `select * from ${DATABASE_NAME}.${TABLE_NAME} where ${FILTER_COLUMN_NAME} = '${namespaceFilterId}'`
            }
          }
        },
        LogicalTableMap: {
          [logicalTableMap]: {
            Alias: 'CustomQuery',
            Source: {
              PhysicalTableId: physicalTableMapId
            }
          }
        },
        Permissions: [
          {
            Principal: `arn:aws:quicksight:${AWS_REGION}:${AWS_ACCOUNT_ID}:user/default/${QUICKSIGHT_ADMIN_USER_NAME}`,
            Actions: [
              'quicksight:UpdateDataSetPermissions',
              'quicksight:DescribeDataSet',
              'quicksight:DescribeDataSetPermissions',
              'quicksight:PassDataSet',
              'quicksight:DescribeIngestion',
              'quicksight:ListIngestions',
              'quicksight:UpdateDataSet',
              'quicksight:DeleteDataSet',
              'quicksight:CreateIngestion',
              'quicksight:CancelIngestion'
            ]
          }
        ]
      })
      .promise()

    console.log('createDataSet', createDataSet)

    const createDashboard = await quicksight
      .createDashboard({
        AwsAccountId: AWS_ACCOUNT_ID,
        DashboardId: namespaceId,
        Name: namespaceId,
        Permissions: [
          {
            Principal: `arn:aws:quicksight:${AWS_REGION}:${AWS_ACCOUNT_ID}:user/default/${QUICKSIGHT_ADMIN_USER_NAME}`,
            Actions: [
              'quicksight:DescribeDashboard',
              'quicksight:ListDashboardVersions',
              'quicksight:UpdateDashboardPermissions',
              'quicksight:QueryDashboard',
              'quicksight:UpdateDashboard',
              'quicksight:DeleteDashboard',
              'quicksight:DescribeDashboardPermissions',
              'quicksight:UpdateDashboardPublishedVersion'
            ]
          },
          {
            Principal: `arn:aws:quicksight:${AWS_REGION}:${AWS_ACCOUNT_ID}:group/${namespaceId}/all-users`,
            Actions: [
              'quicksight:DescribeDashboard',
              'quicksight:ListDashboardVersions',
              'quicksight:QueryDashboard'
            ]
          }
        ],
        SourceEntity: {
          SourceTemplate: {
            DataSetReferences: [
              {
                DataSetPlaceholder: `${TEMPLATE_DATASET_PLACEHOLDER}`,
                DataSetArn: `arn:aws:quicksight:${AWS_REGION}:${AWS_ACCOUNT_ID}:dataset/${namespaceId}`
              }
            ],
            Arn: `arn:aws:quicksight:${AWS_REGION}:${AWS_ACCOUNT_ID}:template/${TEMPLATE_ID}`
          }
        },
        DashboardPublishOptions: {
          AdHocFilteringOption: {
            AvailabilityStatus: 'DISABLED' // or ENABLED
          },
          ExportToCSVOption: {
            AvailabilityStatus: 'DISABLED' // or ENABLED
          },
          SheetControlsOption: {
            VisibilityState: 'COLLAPSED' // or EXPANDED
          }
        }
      })
      .promise()

    console.log('createDashboard:', createDashboard)

    res.status(200).send('ok')
  } catch (err) {
    console.log(err)
    res.status(500).send(err.message)
  }
}

exports.listNamespaces = listNamespaces
exports.deleteNamespace = deleteNamespace
exports.addNamespace = addNamespace
