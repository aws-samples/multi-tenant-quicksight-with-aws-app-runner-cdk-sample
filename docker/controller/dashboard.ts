import * as AWS from 'aws-sdk'
import * as express from 'express'

const AWS_REGION = process.env.AWS_REGION as string
const AWS_ACCOUNT_ID = process.env.AWS_ACCOUNT_ID as string

const quicksight = new AWS.QuickSight({
  apiVersion: '2018-04-01',
  region: AWS_REGION
})

const embedUrl = async (req: express.Request, res: express.Response) => {
  try {
    const namespaceId = req.params.namespaceId
    const userId = req.params.userId

    const getDashboardEmbedUrl = await quicksight
      .getDashboardEmbedUrl({
        AwsAccountId: AWS_ACCOUNT_ID,
        DashboardId: namespaceId,
        IdentityType: 'QUICKSIGHT',
        UserArn: `arn:aws:quicksight:${AWS_REGION}:${AWS_ACCOUNT_ID}:user/${namespaceId}/${userId}`,
        SessionLifetimeInMinutes: 600,
        UndoRedoDisabled: true,
        ResetDisabled: true
      })
      .promise()

    console.log('getDashboardEmbedUrl:', getDashboardEmbedUrl)

    res.status(200).json(getDashboardEmbedUrl)
  } catch (err) {
    console.log(err)
    res.status(500).send(err.message)
  }
}

exports.embedUrl = embedUrl
