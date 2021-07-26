import * as AWS from 'aws-sdk'
import * as uuid from 'uuid'

const AWS_ACCOUNT_ID = process.env.AWS_ACCOUNT_ID as string
const AWS_REGION = process.env.AWS_REGION as string
const DATABASE_NAME = process.env.DATABASE_NAME as string
const TABLE_NAME = process.env.TABLE_NAME as string
const DATASOURCE_ID = process.env.DATASOURCE_ID as string
const FILTER_COLUMN_NAME = process.env.FILTER_COLUMN_NAME as string
const NAMESPACE = process.env.NAMESPACE as string

const quicksight = new AWS.QuickSight({
  apiVersion: '2018-04-01',
  region: AWS_REGION
})

const main = async () => {
  const physicalTableMapId = uuid.v4()
  const logicalTableMap = uuid.v4()

  const updateDataSet = await quicksight
    .updateDataSet({
      AwsAccountId: AWS_ACCOUNT_ID,
      DataSetId: NAMESPACE,
      ImportMode: 'SPICE',
      Name: NAMESPACE,
      PhysicalTableMap: {
        [physicalTableMapId]: {
          CustomSql: {
            DataSourceArn: `arn:aws:quicksight:${AWS_REGION}:${AWS_ACCOUNT_ID}:datasource/${DATASOURCE_ID}`,
            Name: 'CustomQuery',
            SqlQuery: `select * from ${DATABASE_NAME}.${TABLE_NAME} where ${FILTER_COLUMN_NAME} = '${NAMESPACE}'`
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
      }
    })
    .promise()

  console.log('updateDataSet:', updateDataSet)
}

main()
