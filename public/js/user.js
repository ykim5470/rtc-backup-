'use strict'

const signalingServerPort = 18088
const signalingServer = getSignalingServer()

console.log('Connecting to signaling server from user')
let signalingSocket = io(signalingServer)
let peerConnection
let peerConnections = {}
let localMediaStream

document.querySelector('#user_join_btn').addEventListener('click', () => {
  console.log('join to channel', '47819WarmPlum')
  signalingSocket.emit('join', {
    channel: '93057BlueSock1520WhiteDog',
    peer_info: {
      detectRTCversion: '1.4.1',
      isWebRTCSupported: true,
      isMobileDevice: false,
      osName: 'Mac OS X',
      osVersion: '10_15_7',
      browserName: 'Chrome',
      browserVersion: 99,
    },
    peer_role: 'user1',
    peer_geo: {
      businessName: '',
      businessWebsite: '',
      city: 'Seoul',
      continent: 'Asia',
      country: 'South Korea',
      countryCode: 'KR',
      ipName: '',
      ipType: 'Residential',
      isp: 'LG DACOM Corporation',
      lat: '37.566',
      lon: '126.9784',
      message:
        'Important: API Key required, please get your API Key at https://extreme-ip-lookup.com',
      org: 'LG DACOM Corporation',
      query: '106.241.28.11',
      region: 'Seoul',
      status: 'success',
      timezone: 'Asia/Seoul',
      utcOffset: '+09:00',
    },
    peer_name: 'user1',
    peer_video: false,
    peer_audio: false,
    peer_hand: false,
    peer_rec: false,
  })

  signalingSocket.on('addPeer', handleAddPeer)
  signalingSocket.on('iceCandidate', handleIceCandidate)
  signalingSocket.on('sessionDescription', handleSessionDescription) // emit이 안된다.
})

/**
 * Get Signaling server URL
 * @returns Signaling server URL
 */
function getSignalingServer() {
  // if (isHttps) {
  //     return 'https://' + 'localhost' + ':' + signalingServerPort;
  //     // outside of localhost change it with YOUR-SERVER-DOMAIN
  // }
  return (
    'http' +
    (location.hostname == 'localhost' ? '' : 's') +
    '://' +
    location.hostname +
    (location.hostname == 'localhost' ? ':' + signalingServerPort : '')
  )
}

/**
 * When we join a group, our signaling server will send out 'addPeer' events to each pair of users in the group (creating a fully-connected graph of users,
 * ie if there are 6 people in the channel you will connect directly to the other 5, so there will be a total of 15 connections in the network).
 *
 * @param {*} config
 */
function handleAddPeer(config) {
  // console.log("addPeer", JSON.stringify(config));
  console.log('==================active on')
  let peer_id = config.peer_id
  let peers = config.peers
  let should_create_offer = config.should_create_offer
  let iceServers = config.iceServers

  console.log("This one should be the first one's socket id")
  console.log(peer_id)
  console.log(should_create_offer)

  if (peer_id in peerConnections) {
    // This could happen if the user joins multiple channels where the other peer is also in.
    console.log('Already connected to peer', peer_id)
    return
  }

  if (!iceServers) iceServers = backupIceServers
  console.log('iceServers', iceServers[0])

  // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection
  peerConnection = new RTCPeerConnection({ iceServers: iceServers })
  peerConnections[peer_id] = peerConnection

  console.log('-------- user 쪽 rtc instance 확인')
  console.log(peer_id)
  console.log(peerConnections)

  if (should_create_offer) handleRtcOffer(peer_id) // 여기 중간에서 작동이 안 됨.

  handlePeersConnectionStatus(peer_id) // 이건 현재 작동 확인 완료
  // msgerAddPeers(peers);
  handleOnIceCandidate(peer_id) // 이것도 작동 확인 완료
  handleOnTrack(peer_id, peers) // 여기까지는 작동이 된다.
  handleAddTracks(peer_id)

  // handleRTCDataChannels(peer_id);

  // wbUpdate();

  // playSound('addPeer');
}

/**
 * Handle peers connection state
 */
function handlePeersConnectionStatus(peer_id) {
  peerConnections[peer_id].onconnectionstatechange = function (event) {
    const connectionStatus = event.currentTarget.connectionState
    console.log('Connection', {
      peer_id: peer_id,
      connectionStatus: connectionStatus,
    })
  }
}

/**
 * https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/onicecandidate
 *
 * @param {*} peer_id
 */
function handleOnIceCandidate(peer_id) {
  peerConnections[peer_id].onicecandidate = (event) => {
    console.log('이건 올라와 있나?') // 놉 이건 이벤트 콜백인데...
    if (!event.candidate) return
    signalingSocket.emit('relayICE', {
      peer_id: peer_id,
      ice_candidate: {
        sdpMLineIndex: event.candidate.sdpMLineIndex,
        candidate: event.candidate.candidate,
      },
    })
  }
}

/**
 * https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/ontrack
 *
 * @param {*} peer_id
 * @param {*} peers
 */
function handleOnTrack(peer_id, peers) {
  console.log('=====================receive test')
  console.log(peerConnections)
  console.log(peer_id)

  peerConnections[peer_id].ontrack = (event) => {
    console.log('handleOnTrack', event)
    console.log(event.streams[0])
    document.getElementById('videos').srcObject = event.streams[0]
  }
}

/**
 * https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/addTrack
 *
 * @param {*} peer_id
 */
function handleAddTracks(peer_id) {
  console.log('방 생성자는 있으니까 이건 되겠지?')
  peerConnections[peer_id]
  // localMediaStream.getTracks().forEach((track) => {
  //   peerConnections[peer_id].addTrack(track, localMediaStream)
  // })
}

/**
 * Peers exchange session descriptions which contains information about their audio / video settings and that sort of stuff. First
 * the 'offerer' sends a description to the 'answerer' (with type "offer"), then the answerer sends one back (with type "answer").
 *
 * @param {*} config
 */
function handleSessionDescription(config) {
  console.log('이건? 되나?') // 안 됨
  console.log('Remote Session Description', config)

  let peer_id = config.peer_id
  let remote_description = config.session_description

  // https://developer.mozilla.org/en-US/docs/Web/API/RTCSessionDescription
  let description = new RTCSessionDescription(remote_description)

  // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/setRemoteDescription
  peerConnections[peer_id]
    .setRemoteDescription(description)
    .then(() => {
      console.log('setRemoteDescription done!')
      if (remote_description.type == 'offer') {
        console.log('Creating answer')
        // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/createAnswer
        peerConnections[peer_id]
          .createAnswer()
          .then((local_description) => {
            console.log('Answer description is: ', local_description)
            // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/setLocalDescription
            peerConnections[peer_id]
              .setLocalDescription(local_description)
              .then(() => {
                signalingSocket.emit('relaySDP', {
                  peer_id: peer_id,
                  session_description: local_description,
                })
                console.log('Answer setLocalDescription done!')
              })
              .catch((err) => {
                console.error('[Error] answer setLocalDescription', err)
                userLog('error', 'Answer setLocalDescription failed ' + err)
              })
          })
          .catch((err) => {
            console.error('[Error] creating answer', err)
          })
      } // end [if type offer]
    })
    .catch((err) => {
      console.error('[Error] setRemoteDescription', err)
    })
}

/**
 * Only one side of the peer connection should create the offer, the signaling server picks one to be the offerer.
 * The other user will get a 'sessionDescription' event and will create an offer, then send back an answer 'sessionDescription' to us
 *
 * @param {*} peer_id
 */
function handleRtcOffer(peer_id) {
  console.log('여기까지 가기는 하는가?') // ㅇㅇ 그러나 이 다음이 안 된다.
  // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/onnegotiationneeded
  peerConnections[peer_id].onnegotiationneeded = async () => {
    console.log('Creating RTC offer to', peer_id)
    // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/createOffer
    await peerConnections[peer_id]
      .createOffer()
      .then((local_description) => {
        console.log('Local offer description is', local_description)
        // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/setLocalDescription
        peerConnections[peer_id]
          .setLocalDescription(local_description)
          .then(() => {
            signalingSocket.emit('relaySDP', {
              peer_id: peer_id,
              session_description: local_description,
            })
            console.log('Offer setLocalDescription done!')
          })
          .catch((err) => {
            console.error('[Error] offer setLocalDescription', err)
            userLog('error', 'Offer setLocalDescription failed ' + err)
          })
      })
      .catch((err) => {
        console.error('[Error] sending offer', err)
      })
  }
}

/**
 * The offerer will send a number of ICE Candidate blobs to the answerer so they
 * can begin trying to find the best path to one another on the net.
 *
 * @param {*} config
 */
function handleIceCandidate(config) {
  console.log('user먼저 접속 테스트에서는 ice candidate exchange가 되나?')
  let peer_id = config.peer_id
  let ice_candidate = config.ice_candidate
  console.log(
    '이 peer는 상대편 peer인 걸까? 아니면 사용자 peer인 걸까? 누가 먼저지?',
  )
  console.log(peer_id) // 상대편
  console.log(ice_candidate) // 뭔가 정보가 있음 = streamer가 ice layer를 최초로 build start하는 것이 맞음.
  // https://developer.mozilla.org/en-US/docs/Web/API/RTCIceCandidate
  peerConnections[peer_id]
    .addIceCandidate(new RTCIceCandidate(ice_candidate))
    .catch((err) => {
      console.error('[Error] addIceCandidate', err)
    })
}
