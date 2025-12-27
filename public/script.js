const socket = io();
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const startButton = document.getElementById('startButton');
const skipButton = document.getElementById('skipButton');
const reportButton = document.getElementById('reportButton');
const interestsSelect = document.getElementById('interests');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const messagesDiv = document.getElementById('messages');

let localStream;
let peerConnection;
let otherUserId;
const configuration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' }
  ]
};

// Browser compatibility check
if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
  alert('Your browser does not support WebRTC. Please use a modern browser like Chrome, Firefox, or Edge.');
}
if (!window.RTCPeerConnection) {
  alert('Your browser does not support RTCPeerConnection. Please update your browser.');
}

startButton.addEventListener('click', startChat);
skipButton.addEventListener('click', skipChat);
reportButton.addEventListener('click', reportUser);
sendButton.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendMessage();
});

async function startChat() {
  try {
    const selectedOptions = Array.from(interestsSelect.selectedOptions);
    const interests = selectedOptions.map(option => option.value);
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideo.srcObject = localStream;

    peerConnection = new RTCPeerConnection(configuration);
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

    peerConnection.ontrack = (event) => {
      remoteVideo.srcObject = event.streams[0];
    };

    peerConnection.onicecandidate = (event) => {
      if (event.candidate && otherUserId) {
        socket.emit('ice-candidate', event.candidate, otherUserId);
      }
    };

    // Send find-match with interests
    socket.emit('find-match', interests);

    startButton.disabled = true;
    skipButton.disabled = false;
  } catch (error) {
    console.error('Error starting chat:', error);
    alert('Error accessing camera/microphone: ' + error.message);
  }
}

function skipChat() {
  // Stop current connection and start new chat
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
    localStream = null;
  }
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }
  localVideo.srcObject = null;
  remoteVideo.srcObject = null;
  otherUserId = null;
  socket.emit('skip');
  startChat(); // Start new chat
}

function reportUser() {
  if (!otherUserId) return;
  const reason = prompt('Please provide a reason for reporting this user:');
  if (reason && reason.trim()) {
    socket.emit('report', { reportedId: otherUserId, reason: reason.trim() });
    alert('Report submitted. Thank you for helping keep the community safe.');
  }
}

function sendMessage() {
  const message = messageInput.value.trim();
  if (message) {
    // Display own message
    displayMessage('You: ' + message);
    // Placeholder: Emit message to server
    socket.emit('chat-message', message);
    messageInput.value = '';
  }
}

function displayMessage(message) {
  const p = document.createElement('p');
  p.textContent = message;
  messagesDiv.appendChild(p);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Socket event listeners
socket.on('user-connected', async (userId) => {
  console.log('User connected:', userId);
  otherUserId = userId;
  // Create offer
  try {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit('offer', offer, userId);
  } catch (error) {
    console.error('Error creating offer:', error);
  }
});

socket.on('offer', async (offer, fromId) => {
  otherUserId = fromId;
  try {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit('answer', answer, fromId);
  } catch (error) {
    console.error('Error handling offer:', error);
  }
});

socket.on('answer', async (answer) => {
  try {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
  } catch (error) {
    console.error('Error setting remote description:', error);
  }
});

socket.on('ice-candidate', async (candidate) => {
  try {
    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  } catch (error) {
    console.error('Error adding ICE candidate:', error);
  }
});

socket.on('user-disconnected', (userId) => {
  console.log('User disconnected:', userId);
  remoteVideo.srcObject = null;
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }
  otherUserId = null;
});

socket.on('paired', ({ roomId, partnerId }) => {
  otherUserId = partnerId;
  socket.emit('join-room', roomId, socket.id);
});

socket.on('chat-message', (message) => {
  displayMessage('Partner: ' + message);
});