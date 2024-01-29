/**
 * Abstract class to store base Google credentials
 */
class GoogleDrive {
  private clientId: string
  private clientSecret: string
  private appId: string
  private apiToken: string
  private scopes: string[]

  private loadState = 0

  constructor(
    clientId="858773398697-vki2lito392c5dlss9s31ap077nn0qbd.apps.googleusercontent.com",
    clientSecret='',
    appId='binarual-meet',
    apiToken='AIzaSyAADCXxUujmh0VqXIzJofwl03MA5O8v8EQ', scopes=['https://www.googleapis.com/auth/drive.file']) {
    this.clientId = clientId
    this.clientSecret = clientSecret
    this.appId = appId
    this.apiToken=apiToken
    this.scopes = scopes;
    // while (!(window as any).gapi) {
    //   //(window as any).gapi is loading lock until done
    //   console.log('D: loading (window as any).gapi')
    // }
    (window as any).gapi.load('auth', {'callback': this.onAuthApiLoad.bind(this)})
    // while (this.loadState<2) {
    //   //apis still loading
    //   console.log('D: loading (window as any).gapi APIs')
    // }
  }


  private onAuthApiLoad() {
    this.loadState++
    (window as any).gapi.client.load('drive', 'v3',this.onDriveLoad.bind(this))
  }
  private onDriveLoad() {
    this.loadState++
  }

  private async login() {
    const res = await new Promise((resolve, reject)=>{
      console.log((window as any).gapi.auth);
      (window as any).gapi.auth.authorize(
        {
          'client_id': this.clientId,
          'scope': this.scopes,
          'immediate': true
        },
        (r:any)=>r.error?(window as any).gapi.auth.authorize(
          {
            'client_id': this.clientId,
            'scope': this.scopes,
            'immediate': false
          },
          (k:any)=>k.error?reject(k):resolve(k)):resolve(r))
    })
    console.log(res)
  }

  /**
   * uploadFileToGoogleDrive with autogenerated name
   */
  public async uploadFileToGoogleDrive(file: File) {
    await this.login()

    //upsert custom folder (to be a little more organized 😊)
    const {result:{files}} = await (window as any).gapi.client.drive.files.list({
      q:"name='Binaural Meet Files' and mimeType='application/vnd.google-apps.folder' and not trashed=true"
    })

    let dirId=''
    if(!files?.length){
      var fileMetadata = {
        'name' : 'Binaural Meet Files',
        'mimeType' : 'application/vnd.google-apps.folder',
      }
      const directoryResponse = await (window as any).gapi.client.drive.files.create({
        resource: fileMetadata,
      })
      dirId =JSON.parse(directoryResponse.body).id
    }
    else{
      dirId = files[0].id || ''
    }

    //store the file

    const metadata = {
        name: file.name,
        mimeType: file.type,
        parents: [dirId], // Please set folderId here.
    }
    const form = new FormData()
    form.append('metadata', new Blob([JSON.stringify(metadata)], {type: 'application/json'}))
    form.append('file', file)
    const fileUploadResponse = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: new Headers({'Authorization': 'Bearer ' + (window as any).gapi.auth.getToken().access_token}),
      body: form
    }).then((res) => {
      return res.json()
    })

    await (window as any).gapi.client.drive.permissions.create({
      fileId: fileUploadResponse.id,
      resource: {
        role: 'reader',
        type: 'anyone',
      }
    } as any)

  //   const webViewLink = await (window as any).gapi.client.drive.files.get({
  //     fileId: res.id,
  //     fields: 'webViewLink'
  // }).then(response =>
  //     JSON.parse(response.body).webViewLink
  // );
    return `https://drive.google.com/uc?export=view&id=${fileUploadResponse.id}`
  }
}


//always export a default instance
export default new GoogleDrive()