import * as AWS from 'aws-sdk'
import * as express from 'express'

const AWS_ACCOUNT_ID = process.env.AWS_ACCOUNT_ID as string
const AWS_REGION = process.env.AWS_REGION as string
const DUMMY_EMAIL = process.env.DUMMY_EMAIL as string

const quicksight = new AWS.QuickSight({
  apiVersion: '2018-04-01',
  region: AWS_REGION
})

const listUsers = async (req: express.Request, res: express.Response) => {
  try {
    const namespaceId = req.params.namespaceId

    const listGroupMemberships = await quicksight
      .listGroupMemberships({
        AwsAccountId: AWS_ACCOUNT_ID as string,
        GroupName: 'all-users',
        Namespace: namespaceId,
        MaxResults: 100
      })
      .promise()

    console.log('listGroupMemberships:', listGroupMemberships)

    res.status(200).json(listGroupMemberships)
  } catch (err) {
    console.log(err)
    res.status(500).send(err.message)
  }
}

const deleteUser = async (req: express.Request, res: express.Response) => {
  try {
    const userId = req.params.userId
    const namespaceId = req.params.namespaceId

    const deleteGroupMembership = await quicksight
      .deleteGroupMembership({
        AwsAccountId: AWS_ACCOUNT_ID,
        GroupName: 'all-users',
        Namespace: namespaceId,
        MemberName: userId
      })
      .promise()

    console.log('deleteGroupMembership:', deleteGroupMembership)

    const deleteUser = await quicksight
      .deleteUser({
        AwsAccountId: AWS_ACCOUNT_ID,
        Namespace: namespaceId,
        UserName: userId
      })
      .promise()

    console.log('deleteUser:', deleteUser)

    res.status(200).send('ok')
  } catch (err) {
    console.log(err)
    res.status(500).send(err.message)
  }
}

const addUser = async (req: express.Request, res: express.Response) => {
  try {
    const userId = req.body.userId || ''
    const namespaceId = req.params.namespaceId

    if (!userId.trim()) {
      res.status(400).send('invalid arguments')
      return
    }

    const registerUser = await quicksight
      .registerUser({
        IdentityType: 'QUICKSIGHT',
        Email: DUMMY_EMAIL,
        UserRole: 'READER',
        AwsAccountId: AWS_ACCOUNT_ID,
        Namespace: namespaceId,
        UserName: userId
      })
      .promise()

    console.log('registerUser:', registerUser)

    const createGroupMembership = await quicksight
      .createGroupMembership({
        AwsAccountId: AWS_ACCOUNT_ID,
        Namespace: namespaceId,
        GroupName: 'all-users',
        MemberName: userId
      })
      .promise()

    console.log('createGroupMembership:', createGroupMembership)

    res.status(200).json('ok')
  } catch (err) {
    console.log(err)
    res.status(500).send(err.message)
  }
}

exports.listUsers = listUsers
exports.deleteUser = deleteUser
exports.addUser = addUser
