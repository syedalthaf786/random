const socket = io();
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const startButton = document.getElementById('startButton');
const stopButton = document.getElementById('stopButton');

let localStream;
let peerConnection;
const configuration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' }
  ]
};

startButton.addEventListener('click', startChat);
stopButton.addEventListener('click', stopChat);

async function startChat() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideo.srcObject = localStream;

    peerConnection = new RTCPeerConnection(configuration);
    peerConnection.addStream(localStream);

    peerConnection.onaddstream = (event) => {
      remoteVideo.srcObject = event.stream;
    };

    // Generate room ID and join
    const roomId = Math.random().toString(36).substring(7);
    socket.emit('join-room', roomId, socket.id);

    startButton.disabled = true;
    stopButton.disabled = false;
  } catch (error) {
    console.error('Error starting chat:', error);
  }
}

function stopChat() {
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
  }
  if (peerConnection) {
    peerConnection.close();
  }
  localVideo.srcObject = null;
  remoteVideo.srcObject = null;
  startButton.disabled = false;
  stopButton.disabled = true;
}

// Socket event listeners
socket.on('user-connected', (userId) => {
  console.log('User connected:', userId);
  // Handle WebRTC signaling here
});

socket.on('user-disconnected', (userId) => {
  console.log('User disconnected:', userId);
  remoteVideo.srcObject = null;
});