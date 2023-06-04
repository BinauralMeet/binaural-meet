
import {MSCreateTransportMessage, MSMessage, MSPeerMessage, MSConnectMessage, MSMessageType, MSRoomMessage,
  MSRTPCapabilitiesReply, MSTransportDirection, MSCreateTransportReply, MSConnectTransportMessage,
  MSConnectTransportReply, MSProduceTransportMessage, MSProduceTransportReply, MSTrackRole,
  MSConsumeTransportMessage, MSConsumeTransportReply, MSRemoteUpdateMessage, MSRemoteLeftMessage,
  MSResumeConsumerMessage, MSResumeConsumerReply, MSCloseProducerMessage, MSRemoteProducer,
  MSCloseProducerReply,
  MSStreamingStartMessage,
  MSStreamingStopMessage,
  MSRoomJoinMessage} from './MediaMessages'

  export async function fetchRoomById(roomId: string) {
    const response = await fetch(`http://localhost:3200/rooms/${roomId}`);
    const room = await response.json();
    //console.log("Get data: ", room);
    return room;
}

export async function createRoom(newRoom: MSRoomJoinMessage) {
    const response = await fetch('http://localhost:3200/rooms', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(newRoom),
    });

    const createdRoom = await response.json();
    console.log(createdRoom);
    return createdRoom;
}