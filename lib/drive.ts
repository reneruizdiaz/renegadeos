import { google } from 'googleapis'
import type { DriveData, DriveFileName } from './schema'

function getAuth() {
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
  if (!key) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY is not set')

  const credentials = JSON.parse(key)
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive'],
  })
}

function getDrive() {
  return google.drive({ version: 'v3', auth: getAuth() })
}

async function findFileId(filename: string): Promise<string | null> {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID
  if (!folderId) throw new Error('GOOGLE_DRIVE_FOLDER_ID is not set')

  const drive = getDrive()
  const res = await drive.files.list({
    q: `'${folderId}' in parents and name = '${filename}' and trashed = false`,
    fields: 'files(id, name)',
  })

  return res.data.files?.[0]?.id ?? null
}

export async function getDriveFile<K extends DriveFileName>(
  filename: K
): Promise<DriveData[K]> {
  const drive = getDrive()
  const fileId = await findFileId(filename)

  if (!fileId) {
    throw new Error(`File not found in Drive: ${filename}`)
  }

  const res = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'text' }
  )

  return JSON.parse(res.data as string) as DriveData[K]
}

export async function updateDriveFile<K extends DriveFileName>(
  filename: K,
  data: DriveData[K]
): Promise<void> {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID
  if (!folderId) throw new Error('GOOGLE_DRIVE_FOLDER_ID is not set')

  const drive = getDrive()
  const content = JSON.stringify(data, null, 2)
  const media = {
    mimeType: 'application/json',
    body: content,
  }

  const existingId = await findFileId(filename)

  if (!existingId) {
    throw new Error(
      `File not found in Drive: ${filename}. Upload it manually to the Drive folder first.`
    )
  }

  await drive.files.update({
    fileId: existingId,
    media,
  })
}
