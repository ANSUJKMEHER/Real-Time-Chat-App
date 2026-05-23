import React, { useEffect, useRef, useState } from 'react';
import { PhoneOff, Video, Mic, MicOff, VideoOff, Phone } from 'lucide-react';

const VideoCallModal = ({ user, socket, callData, remoteUser, callType, onClose }) => {
    const [localStream, setLocalStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const [callAccepted, setCallAccepted] = useState(false);
    const [callEnded, setCallEnded] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);

    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const connectionRef = useRef(null);
    const streamRef = useRef(null);

    // Call status: 'idle', 'calling', 'receiving', 'connected'
    const [status, setStatus] = useState(
        callData ? 'receiving' : remoteUser ? 'calling' : 'idle'
    );

    useEffect(() => {
        // Initialize Media
        const videoConstraints = callType === 'video' ? { facingMode: 'user' } : false;
        navigator.mediaDevices.getUserMedia({ video: videoConstraints, audio: true })
            .then((stream) => {
                setLocalStream(stream);
                streamRef.current = stream;
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = stream;
                }

                // If we are the caller, initiate the call immediately once stream is ready
                if (remoteUser && status === 'calling') {
                    initiateCall(stream);
                }
            })
            .catch(err => {
                console.error("Failed to get local stream", err);
                alert("Could not access camera/microphone");
                onClose();
            });

        // Socket listeners
        socket.on('call_accepted', (signal) => {
            setCallAccepted(true);
            setStatus('connected');
            if (connectionRef.current) {
                connectionRef.current.setRemoteDescription(new RTCSessionDescription(signal));
            }
        });

        socket.on('ice_candidate', (candidate) => {
            if (connectionRef.current) {
                connectionRef.current.addIceCandidate(new RTCIceCandidate(candidate))
                    .catch(e => console.error("Error adding ice candidate", e));
            }
        });

        socket.on('call_ended', () => {
            leaveCall(false);
        });

        socket.on('call_rejected', () => {
            alert('Call was rejected');
            leaveCall(false);
        });

        return () => {
            socket.off('call_accepted');
            socket.off('ice_candidate');
            socket.off('call_ended');
            socket.off('call_rejected');
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
            if (connectionRef.current) {
                connectionRef.current.close();
            }
        };
    }, []);

    const createPeerConnection = (stream, isInitiator, remoteId) => {
        const peer = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:global.stun.twilio.com:3478' }
            ]
        });

        connectionRef.current = peer;

        // Add local stream tracks to peer connection
        stream.getTracks().forEach(track => {
            peer.addTrack(track, stream);
        });

        // Handle incoming ICE candidates
        peer.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('ice_candidate', {
                    to: remoteId,
                    candidate: event.candidate
                });
            }
        };

        // Handle incoming remote stream
        peer.ontrack = (event) => {
            setRemoteStream(event.streams[0]);
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = event.streams[0];
            }
        };

        return peer;
    };

    const initiateCall = async (stream) => {
        const peer = createPeerConnection(stream, true, remoteUser.id);

        try {
            const offer = await peer.createOffer();
            await peer.setLocalDescription(offer);

            socket.emit('call_user', {
                userToCall: remoteUser.id,
                signalData: offer,
                from: user.id,
                name: user.name,
                callType: callType
            });
        } catch (err) {
            console.error("Error creating offer", err);
        }
    };

    const answerCall = async () => {
        setCallAccepted(true);
        setStatus('connected');

        const peer = createPeerConnection(localStream, false, callData.from);

        try {
            await peer.setRemoteDescription(new RTCSessionDescription(callData.signal));
            const answer = await peer.createAnswer();
            await peer.setLocalDescription(answer);

            socket.emit('answer_call', {
                to: callData.from,
                signal: answer
            });
        } catch (err) {
            console.error("Error answering call", err);
        }
    };

    const rejectCall = () => {
        if (callData) {
            socket.emit('reject_call', { to: callData.from });
        }
        onClose();
    };

    const leaveCall = (emitEvent = true) => {
        setCallEnded(true);
        if (emitEvent) {
            const toId = remoteUser ? remoteUser.id : callData?.from;
            if (toId) socket.emit('end_call', { to: toId });
        }

        if (connectionRef.current) {
            connectionRef.current.close();
            connectionRef.current = null;
        }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }

        onClose();
    };

    const toggleMute = () => {
        if (localStream) {
            const audioTrack = localStream.getAudioTracks()[0];
            audioTrack.enabled = !audioTrack.enabled;
            setIsMuted(!audioTrack.enabled);
        }
    };

    const toggleVideo = () => {
        if (localStream) {
            const videoTrack = localStream.getVideoTracks()[0];
            videoTrack.enabled = !videoTrack.enabled;
            setIsVideoOff(!videoTrack.enabled);
        }
    };

    return (
        <div className="video-modal-overlay">
            <div className="video-modal-content">
                <div className={`video-grid ${callAccepted && !callEnded ? 'connected' : ''}`} style={{ display: callType === 'video' ? 'flex' : 'none' }}>
                    {/* Local Video */}
                    <div className="video-wrapper local-video">
                        <video playsInline muted ref={localVideoRef} autoPlay />
                        <div className="video-label">You</div>
                    </div>

                    {/* Remote Video (Only shows when connected) */}
                    {callAccepted && !callEnded && (
                        <div className="video-wrapper remote-video">
                            <video playsInline ref={remoteVideoRef} autoPlay />
                            <div className="video-label">
                                {remoteUser ? remoteUser.name : callData?.name}
                            </div>
                        </div>
                    )}
                </div>

                {/* Audio Call UI (Only shows for Audio calls) */}
                {callType === 'audio' && (
                    <div className="audio-call-ui">
                        {/* Hidden video elements just to play the audio stream easily */}
                        <video playsInline muted ref={localVideoRef} autoPlay style={{ display: 'none' }} />
                        <video playsInline ref={remoteVideoRef} autoPlay style={{ display: 'none' }} />
                        
                        <div className="audio-avatar-container">
                            <div className="pulse-ring audio-pulse"></div>
                            <div className="audio-avatar">
                                {(remoteUser ? remoteUser.name : callData?.name || 'U').charAt(0).toUpperCase()}
                            </div>
                        </div>
                        <h2 style={{ marginTop: '2rem', zIndex: 10, position: 'relative' }}>
                            {remoteUser ? remoteUser.name : callData?.name}
                        </h2>
                        <div style={{ color: 'var(--text-muted)', marginTop: '0.5rem', zIndex: 10, position: 'relative' }}>
                            {status === 'connected' ? 'Connected' : status === 'calling' ? 'Calling...' : 'Incoming...'}
                        </div>
                    </div>
                )}

                {/* Incoming Call UI */}
                {status === 'receiving' && !callAccepted && (
                    <div className="incoming-call-overlay">
                        <h3>{callData.name} is calling...</h3>
                        <div className="call-actions">
                            <button onClick={answerCall} className="call-btn accept"><Phone size={24} /></button>
                            <button onClick={rejectCall} className="call-btn reject"><PhoneOff size={24} /></button>
                        </div>
                    </div>
                )}

                {/* Calling UI */}
                {status === 'calling' && !callAccepted && (
                    <div className="calling-overlay">
                        <h3>Calling {remoteUser?.name}...</h3>
                        <div className="pulse-ring"></div>
                        <button onClick={() => leaveCall(true)} className="call-btn reject"><PhoneOff size={24} /></button>
                    </div>
                )}

                {/* Active Call Controls */}
                {status === 'connected' && (
                    <div className="active-call-controls">
                        <button onClick={toggleMute} className={`control-btn ${isMuted ? 'disabled' : ''}`}>
                            {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                        </button>
                        {callType === 'video' && (
                            <button onClick={toggleVideo} className={`control-btn ${isVideoOff ? 'disabled' : ''}`}>
                                {isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
                            </button>
                        )}
                        <button onClick={() => leaveCall(true)} className="control-btn end-call">
                            <PhoneOff size={20} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VideoCallModal;
