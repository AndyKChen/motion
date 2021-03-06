import React, { useEffect, useRef, useState } from 'react';

import { Alert } from '@material-ui/lab';
import { Button } from '@material-ui/core';
import CallEndIcon from '@material-ui/icons/CallEnd';
import CloudUploadIcon from '@material-ui/icons/CloudUpload';
import { Howl } from 'howler';
import Navigation from '../Components/Navigation/Navigation';
import Peer from 'simple-peer';
import Rodal from 'rodal';
import VideoFrame from '../Components/VideoFrame';
import VolumeOffIcon from '@material-ui/icons/VolumeOff';
import VolumeUpIcon from '@material-ui/icons/VolumeUp';
import io from 'socket.io-client';
import ringtone from '../Sounds/ringtone.mp3';
import { useAuth } from '../Contexts/AuthContext';
import { useHistory } from 'react-router';
import useStyles from './Landing-jss';

// --------------------------------------------------

var identity = 0;
var classes_names = [
  { id: 1, name: 'none', count: 5 },
  { id: 2, name: 'hello', count: 5 },
  { id: 3, name: 'i love you', count: 5 },
  { id: 4, name: 'thank you', count: 5 },
  { id: 6, name: 'I', count: 5 },
  { id: 7, name: 'like', count: 5 },
  { id: 8, name: 'your', count: 5 },
  { id: 9, name: 'goose', count: 5 },
];

const ringtoneSound = new Howl({
  src: [ringtone],
  loop: true,
  preload: true,
});

const Landing = () => {
  const [predictionText, setPredictionText] = useState('');

  const [yourID, setYourID] = useState('');
  const [users, setUsers] = useState({});
  const [stream, setStream] = useState();
  const [receivingCall, setReceivingCall] = useState(false);
  const [caller, setCaller] = useState('');
  const [callingFriend, setCallingFriend] = useState(false);
  const [callerSignal, setCallerSignal] = useState();
  const [callAccepted, setCallAccepted] = useState(false);
  const [callRejected, setCallRejected] = useState(false);
  const [receiverID, setReceiverID] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [isfullscreen, setFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [prediction1Text, setPrediction1Text] = useState('');

  const userVideo = useRef();
  const partnerVideo = useRef();
  const socket = useRef();
  const myPeer = useRef();
  const classes = useStyles();
  const uploadEl = useRef();
  const [error, setError] = useState('');
  const { currentUser, logout } = useAuth();
  const history = useHistory();

  useEffect(() => {
    socket.current = io.connect('/');

    socket.current.on('yourID', (id) => {
      setYourID(id);
    });
    socket.current.on('allUsers', (users) => {
      setUsers(users);
    });

    socket.current.on('hey', (data) => {
      setReceivingCall(true);
      ringtoneSound.play();
      setCaller(data.from);
      setCallerSignal(data.signal);
    });
  }, []);

  function acceptCall() {
    ringtoneSound.unload();
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        setStream(stream);
        if (userVideo.current) {
          userVideo.current.srcObject = stream;
        }
        setCallAccepted(true);
        const peer = new Peer({
          initiator: false,
          trickle: false,
          stream: stream,
        });

        myPeer.current = peer;

        peer.on('signal', (data) => {
          socket.current.emit('acceptCall', { signal: data, to: caller });
        });

        peer.on('stream', (stream) => {
          partnerVideo.current.srcObject = stream;
        });

        peer.on('error', (err) => {
          endCall();
        });

        peer.signal(callerSignal);

        socket.current.on('close', () => {
          window.location.reload();
        });
      })
      .catch(() => {
        setModalMessage(
          'You cannot place/ receive a call without granting video and audio permissions! Please change your settings to use this app.',
        );
        setModalVisible(true);
      });
  }

  function rejectCall() {
    ringtoneSound.unload();
    setCallRejected(true);
    socket.current.emit('rejected', { to: caller });
    window.location.reload();
  }

  function endCall() {
    myPeer.current.destroy();
    socket.current.emit('close', { to: caller });
    window.location.reload();
  }

  function renderLanding() {
    if (!callRejected && !callAccepted && !callingFriend) return 'block';
    return 'none';
  }

  function renderCall() {
    if (!callRejected && !callAccepted && !callingFriend) return 'none';
    return 'block';
  }

  function showCopiedMessage() {
    navigator.clipboard.writeText(yourID);
    setCopied(true);
    setInterval(() => {
      setCopied(false);
    }, 1000);
  }

  let UserVideo;
  if (stream) {
    UserVideo = (
      <VideoFrame
        name={currentUser.email}
        id="predictionsUser"
        prediction={predictionText}
        video={
          <video
            className="userVideo"
            playsInline
            muted
            ref={userVideo}
            className={classes.video}
            autoPlay
          />
        }
      />
    );
  }

  let PartnerVideo;
  if (callAccepted) {
    if (callAccepted && isfullscreen) {
      PartnerVideo = (
        <VideoFrame
          video={
            <video
              playsInline
              ref={partnerVideo}
              className={`partnerVideo cover ${classes.video}`}
              autoPlay
            />
          }
        />
      );
    } else if (callAccepted && !isfullscreen) {
      PartnerVideo = (
        <VideoFrame
          name={currentUser.email}
          id="prediction1"
          prediction={prediction1Text}
          video={
            <video
              className="partnerVideo"
              playsInline
              ref={partnerVideo}
              className={`partnerVideo ${classes.video} `}
              autoPlay
            />
          }
        />
      );
    }
  }

  let incomingCall;
  if (receivingCall && !callAccepted && !callRejected) {
    incomingCall = (
      <div className="incomingCallContainer">
        <div className="incomingCall flex flex-column">
          <div>
            <span className="callerID">{caller}</span> is calling you!
          </div>
          <div className="incomingCallButtons flex">
            <button name="accept" className="alertButtonPrimary" onClick={() => acceptCall()}>
              Accept
            </button>
            <button name="reject" className="alertButtonSecondary" onClick={() => rejectCall()}>
              Reject
            </button>
          </div>
        </div>
      </div>
    );
  }

  function callPeer(id) {
    if (id !== '' && users[id] && id !== yourID) {
      navigator.mediaDevices
        .getUserMedia({ video: true, audio: true })
        .then((stream) => {
          getUserData();

          setStream(stream);
          setCallingFriend(true);
          setCaller(id);
          if (userVideo.current) {
            userVideo.current.srcObject = stream;
          }
          const peer = new Peer({
            initiator: true,
            trickle: false,
            config: {
              iceServers: [
                { url: 'stun:stun01.sipphone.com' },
                { url: 'stun:stun.ekiga.net' },
                { url: 'stun:stun.fwdnet.net' },
                { url: 'stun:stun.ideasip.com' },
                { url: 'stun:stun.iptel.org' },
                { url: 'stun:stun.rixtelecom.se' },
                { url: 'stun:stun.schlund.de' },
                { url: 'stun:stun.l.google.com:19302' },
                { url: 'stun:stun1.l.google.com:19302' },
                { url: 'stun:stun2.l.google.com:19302' },
                { url: 'stun:stun3.l.google.com:19302' },
                { url: 'stun:stun4.l.google.com:19302' },
                { url: 'stun:stunserver.org' },
                { url: 'stun:stun.softjoys.com' },
                { url: 'stun:stun.voiparound.com' },
                { url: 'stun:stun.voipbuster.com' },
                { url: 'stun:stun.voipstunt.com' },
                { url: 'stun:stun.voxgratia.org' },
                { url: 'stun:stun.xten.com' },
                {
                  url: 'turn:numb.viagenie.ca',
                  credential: 'muazkh',
                  username: 'webrtc@live.com',
                },
                {
                  url: 'turn:192.158.29.39:3478?transport=udp',
                  credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
                  username: '28224511:1379330808',
                },
                {
                  url: 'turn:192.158.29.39:3478?transport=tcp',
                  credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
                  username: '28224511:1379330808',
                },
              ],
            },
            stream: stream,
          });

          myPeer.current = peer;

          peer.on('signal', (data) => {
            socket.current.emit('callUser', {
              userToCall: id,
              signalData: data,
              from: yourID,
            });
          });

          peer.on('stream', (stream) => {
            if (partnerVideo.current) {
              partnerVideo.current.srcObject = stream;
            }
          });

          peer.on('error', (err) => {
            endCall();
          });

          socket.current.on('callAccepted', (signal) => {
            setCallAccepted(true);
            peer.signal(signal);
          });

          socket.current.on('close', () => {
            window.location.reload();
          });

          socket.current.on('prediction-recieved', (data) => {
            console.log(data, receivingCall);
            setPrediction1Text(data);
          });

          socket.current.on('rejected', () => {
            window.location.reload();
          });
        })
        .catch(() => {
          setModalMessage(
            'You cannot place/ receive a call without granting video and audio permissions! Please change your settings to use this app.',
          );
          setModalVisible(true);
        });
    } else {
      setModalMessage('We think the username entered is wrong. Please check again and retry!');
      setModalVisible(true);
      return;
    }
  }

  // ------------------------------------------

  async function handleLogout() {
    setError('');
    try {
      await logout();
      history.push('/login');
    } catch {
      setError('Failed to log out');
    }
  }

  async function getUserData() {
    const body = {
      username: currentUser.email,
    };
    const response = await fetch('/user-model', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    console.log('data', data);
  }

  function changePrediction() {
    socket.current = io.connect('/');
    const predictions = document.getElementById('predictions');
    const text = predictions.innerHTML;
    console.log(text);
    socket.current.emit('send-prediction', text);
  }

  // -------------------------------------------------
  let landingHTML = (
    <>
      <Navigation />
      <main>
        <div className="u-margin-top-xxlarge u-margin-bottom-xxlarge">
          <div className="o-wrapper-l">
            <div className="hero flex flex-column">
              <div>
                <div className="welcomeText">motion</div>
                <div className="descriptionText">across the world for free</div>
              </div>
              <div>
                <div className="actionText">
                  Ready for a call,{' '}
                  <span
                    className={copied ? 'username highlight copied' : 'username highlight'}
                    onClick={() => {
                      showCopiedMessage();
                    }}
                  >
                    {yourID}
                  </span>
                  ?
                </div>
              </div>
              <div className="callBox flex">
                <input
                  type="text"
                  placeholder="Friend ID #"
                  value={receiverID}
                  onChange={(e) => setReceiverID(e.target.value)}
                  className="form-input"
                />
                <button
                  onClick={() => callPeer(receiverID.toLowerCase().trim())}
                  className="primaryButton"
                >
                  Call
                </button>
              </div>
              <div>
                Give a friend your username (<span className="username">{yourID}</span>) or enter
                their ID and press call
              </div>
              {error && <Alert severity="error">{error}</Alert>}
              <div className={classes.logoutButton}>
                {currentUser ? (
                  <Button onClick={handleLogout}>Log Out</Button>
                ) : (
                  <div>
                    <Button href="/signup">SignUP</Button>
                    <Button href="/login">Login</Button>
                  </div>
                )}
              </div>
              <strong>Email:</strong> {currentUser && currentUser.email}
            </div>
          </div>
        </div>
      </main>
    </>
  );

  const start = async () => {
    const predictions = document.getElementById('predictions');
    const confidence = document.getElementById('confidence');

    const createKNNClassifier = async () => {
      console.log('Loading KNN Classifier');
      return await window.knnClassifier.create();
    };
    const createMobileNetModel = async () => {
      console.log('Loading Mobilenet Model');
      return await window.mobilenet.load();
    };
    const createWebcamInput = async () => {
      console.log('Loading Webcam Input');
      const webcamElement = await document.getElementById('webcam');
      return await window.tf.data.webcam(webcamElement);
    };

    const mobilenetModel = await createMobileNetModel();
    const knnClassifierModel = await createKNNClassifier();
    const webcamInput = await createWebcamInput();

    const uploadModel = async (classifierModel, event) => {
      let inputModel = event.target.files;
      console.log('Uploading');
      let fr = new FileReader();
      if (inputModel.length > 0) {
        fr.onload = async () => {
          var dataset = fr.result;
          var tensorObj = JSON.parse(dataset);

          Object.keys(tensorObj).forEach((key) => {
            tensorObj[key] = window.tf.tensor(tensorObj[key], [tensorObj[key].length / 1024, 1024]);
          });
          classifierModel.setClassifierDataset(tensorObj);
          console.log('Classifier has been set up! Congrats! ');
        };
      }
      await fr.readAsText(inputModel[0]);
      console.log('Uploaded');
    };

    const initializeElements = () => {
      document
        .getElementById('load_button')
        .addEventListener('change', (event) => uploadModel(knnClassifierModel, event));
    };

    const imageClassificationWithTransferLearningOnWebcam = async () => {
      console.log('Machine Learning on the web is ready');
      while (true) {
        if (knnClassifierModel.getNumClasses() > 0) {
          const img = await webcamInput.capture();

          // Get the activation from mobilenet from the webcam.
          const activation = mobilenetModel.infer(img, 'conv_preds');
          // Get the most likely class and confidences from the classifier module.
          const result = await knnClassifierModel.predictClass(activation);

          //console.log(classes[result.label - 1].name)
          let text = '';
          try {
            predictions.innerHTML = classes_names[result.label - 1]['name'];
            text = classes_names[result.label - 1]['name'];
            confidence.innerHTML = Math.floor(result.confidences[result.label] * 100);
          } catch (err) {
            predictions.innerHTML = result.label - 1;
            text = result.label - 1;
            confidence.innerHTML = Math.floor(result.confidences[result.label] * 100);
          }
          if (text !== predictionText) {
            setPredictionText(text);
          }

          document.getElementById('change-prediction').click();
          // Dispose the tensor to release the memory.
          img.dispose();
        }
        await window.tf.nextFrame();
      }
    };

    await initializeElements();
    console.log(knnClassifierModel);

    await imageClassificationWithTransferLearningOnWebcam();
  };

  window.onload = async () => {
    await start();
  };

  return (
    <>
      <div style={{ display: renderLanding() }}>
        {landingHTML}
        <Rodal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          width={20}
          height={5}
          measure={'em'}
          closeOnEsc={true}
        >
          <div>{modalMessage}</div>
        </Rodal>
        {incomingCall}
      </div>
      <div className={`callContainer ${classes.videoBackground}`} style={{ display: renderCall() }}>
        <div className={classes.videoContainer}>
          <Button
            variant="outlined"
            color="primary"
            className={classes.downloadBtn}
            startIcon={<CloudUploadIcon />}
            onClick={() => uploadEl.current.click()}
          >
            Upload
          </Button>
          <div className={classes.twoVideos}>
            <div className="">{PartnerVideo}</div>
            <div className="">{UserVideo}</div>
          </div>
        </div>
        <div className={classes.btnContainer}>
          <Button
            variant="contained"
            className={classes.endCallBtn}
            startIcon={<CallEndIcon />}
            onClick={endCall}
          >
            End Call
          </Button>
        </div>
      </div>
      {error && <Alert severity="error">{error}</Alert>}
      <div hidden>
        <div id="video-grid"></div>
        <div id="loading"></div>
        <div className="row">
          <div className="mycam">
            <video hidden autoPlay playsInline muted id="webcam" className="cam"></video>
            <div className="grey-bg">
              <div> prediction1 {prediction1Text}</div>
              <div> predictionsUser {predictionText}</div>

              <div className="row text-center">
                <h3>
                  Prediction: <span id="predictions"></span>
                </h3>
                <h3>
                  Probability : <span id="confidence"></span> %
                </h3>
                <button hidden onClick={changePrediction} id="change-prediction"></button>
              </div>
            </div>
          </div>
          <div className="column flex-2-container">
            <div>
              <div className="model">
                <input
                  ref={uploadEl}
                  id="load_button"
                  className="fileinputs"
                  type="file"
                  accept=".json"
                ></input>
                <label htmlFor="upload-photo">Browse...</label>
              </div>

              <div id="training-cards"></div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Landing;
