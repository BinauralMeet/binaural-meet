export function getNotificationPermission(){
  if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
    Notification.requestPermission()
  }
}
export function notification(title: string, options?: NotificationOptions){
  if (Notification.permission === "granted") {
    // tslint:disable-next-line: no-unused-expression
    new Notification(title, options)
  }
}
