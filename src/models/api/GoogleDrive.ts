
import { conference } from "@models/conference"


class GoogleDrive{
  public async uploadFileToGoogleDrive(file:File) {
    // max image size is 5MB
    const imageLimitation = 5242880
    if(file.size > imageLimitation) {
      console.log('file size is too big')
      throw 'too big'
    }
    else{
      const promise = new Promise<string>((resolutionFunc, rejectionFunc) => {
        conference.uploadFiletoGoogleDrive(file).then((result) => {
          //  The server answers 'upload error' when Drive refused the file (bmMediasoupServer
          //  GoogleServer.uploadFile); that is not a file id.
          if(!result || result == 'reject' || result == 'upload error') {
            rejectionFunc(result || 'reject')
          }
          else{
            const fileID = result
            // Normal google drive link donesn't work for some reason...
            // Detail in https://stackoverflow.com/questions/77803187/having-trouble-displaying-an-image-from-google-drive
            resolutionFunc(`https://drive.google.com/thumbnail?id=${fileID}&sz=w1000`)
          }

        })
      })

      return promise
    }
  }

}

//always export a default instance
export default new GoogleDrive()