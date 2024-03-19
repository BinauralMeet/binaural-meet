
import { conference } from "@models/conference"


class GoogleDrive{
  public async uploadFileToGoogleDrive(file:File) {
    // max image size is 5MB
    const imageLimitation = 5242880
    if(file.size > imageLimitation) {
      console.log('file size is too big')
      return 'reject'
    }
    else{
      const promise = new Promise<string>((resolutionFunc, rejectionFunc) => {
        conference.uploadFiletoGoogleDrive(file).then((result) => {
          if(result == 'reject') {
            rejectionFunc('reject')
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