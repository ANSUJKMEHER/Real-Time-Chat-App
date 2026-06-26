import React, { useEffect, useRef, useState } from 'react';
import { PhoneOff, Video, Mic, MicOff, VideoOff, Phone, Clock, MonitorUp, MonitorOff } from 'lucide-react';

const VideoCallModal = ({ user, socket, callData, remoteUser, callType, onClose }) => {
    const [localStream, setLocalStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const [callAccepted, setCallAccepted] = useState(false);
    const [callEnded, setCallEnded] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [callDuration, setCallDuration] = useState(0);
    const timerRef = useRef(null);

    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const connectionRef = useRef(null);
    const streamRef = useRef(null);
    const screenStreamRef = useRef(null);
    const pendingCandidates = useRef([]);

    // Helper to process queued ICE candidates
    const flushIceCandidates = () => {
        if (connectionRef.current && connectionRef.current.remoteDescription) {
            pendingCandidates.current.forEach(candidate => {
                connectionRef.current.addIceCandidate(new RTCIceCandidate(candidate))
                    .catch(e => console.error("Error adding queued ice candidate", e));
            });
            pendingCandidates.current = [];
        }
    };

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
        socket.on('call_accepted', async (signal) => {
            setCallAccepted(true);
            setStatus('connected');
            // Start call timer
            timerRef.current = setInterval(() => setCallDuration(prev => prev + 1), 1000);
            if (connectionRef.current) {
                await connectionRef.current.setRemoteDescription(new RTCSessionDescription(signal));
                flushIceCandidates();
            }
        });

        socket.on('ice_candidate', (candidate) => {
            if (connectionRef.current && connectionRef.current.remoteDescription) {
                connectionRef.current.addIceCandidate(new RTCIceCandidate(candidate))
                    .catch(e => console.error("Error adding ice candidate", e));
            } else {
                pendingCandidates.current.push(candidate);
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
            if (screenStreamRef.current) {
                screenStreamRef.current.getTracks().forEach(track => track.stop());
            }
            if (connectionRef.current) {
                connectionRef.current.close();
            }
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    // Sync remote stream to video element whenever either becomes available
    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
            remoteVideoRef.current.play().catch(e => console.warn('Play error:', e));
        }
    }, [remoteStream, callAccepted]);

    // Sync local stream to video element to fix missing local video on the receiver side
    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
            localVideoRef.current.play().catch(e => console.warn('Local play error:', e));
        }
    }, [localStream, callAccepted]);

    const createPeerConnection = (stream, isInitiator, remoteId) => {
        const peer = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:global.stun.twilio.com:3478' }
            ]
        });

        connectionRef.current = peer;

        // Add local stream tracks to peer connection
        if (stream) {
            stream.getTracks().forEach(track => {
                peer.addTrack(track, stream);
            });
        }

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
        // Start call timer
        timerRef.current = setInterval(() => setCallDuration(prev => prev + 1), 1000);

        const peer = createPeerConnection(streamRef.current, false, callData.from);

        try {
            await peer.setRemoteDescription(new RTCSessionDescription(callData.signal));
            flushIceCandidates();
            
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

        if (timerRef.current) clearInterval(timerRef.current);

        onClose();
    };

    const toggleMute = () => {
        if (streamRef.current) {
            const audioTrack = streamRef.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMuted(!audioTrack.enabled);
            }
        }
    };

    const toggleVideo = () => {
        if (streamRef.current) {
            const videoTrack = streamRef.current.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsVideoOff(!videoTrack.enabled);
            }
        }
    };

    const toggleScreenShare = async () => {
        if (!isScreenSharing) {
            try {
                const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
                const screenTrack = screenStream.getVideoTracks()[0];
                
                screenTrack.onended = () => stopScreenShare();

                if (connectionRef.current) {
                    const senders = connectionRef.current.getSenders();
                    const videoSender = senders.find(s => s.track && s.track.kind === 'video');
                    if (videoSender) videoSender.replaceTrack(screenTrack);
                }
                
                if (localVideoRef.current) localVideoRef.current.srcObject = screenStream;
                screenStreamRef.current = screenStream;
                setIsScreenSharing(true);
            } catch (error) { console.error("Error sharing screen:", error); }
        } else {
            stopScreenShare();
        }
    };

    const stopScreenShare = () => {
        if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach(track => track.stop());
            screenStreamRef.current = null;
        }
        if (streamRef.current) {
            const videoTrack = streamRef.current.getVideoTracks()[0];
            if (connectionRef.current && videoTrack) {
                const senders = connectionRef.current.getSenders();
                const videoSender = senders.find(s => s.track && s.track.kind === 'video');
                if (videoSender) videoSender.replaceTrack(videoTrack);
            }
            if (localVideoRef.current) localVideoRef.current.srcObject = streamRef.current;
        }
        setIsScreenSharing(false);
    };

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    const remoteName = remoteUser ? remoteUser.name : callData?.name || 'Unknown';
    const remoteInitial = remoteName.charAt(0).toUpperCase();

    return (
        <div className="video-modal-overlay">
            <div className="video-modal-content">
                {/* Video Call Grid */}
                {callType === 'video' && (
                    <div className={`video-grid ${callAccepted && !callEnded ? 'connected' : ''}`}>
                        <div className="video-wrapper remote-video" style={{ display: callAccepted && !callEnded ? 'flex' : 'none' }}>
                            <video playsInline ref={remoteVideoRef} autoPlay />
                            <div className="video-label">{remoteName}</div>
                        </div>
                        <div className="video-wrapper local-video">
                            <video playsInline muted ref={localVideoRef} autoPlay />
                            <div className="video-label">You</div>
                        </div>
                    </div>
                )}

                {/* Audio Call UI */}
                {callType === 'audio' && (
                    <div className="audio-call-ui">
                        <video playsInline muted ref={localVideoRef} autoPlay style={{ display: 'none' }} />
                        <video playsInline ref={remoteVideoRef} autoPlay style={{ display: 'none' }} />
                        <div className="audio-avatar-container">
                            <div className="pulse-ring audio-pulse"></div>
                            <div className="audio-avatar">{remoteInitial}</div>
                        </div>
                        <h2 style={{ marginTop: '2rem', zIndex: 10, position: 'relative' }}>{remoteName}</h2>
                        <div className="call-status-text">
                            {status === 'connected' ? formatTime(callDuration) : status === 'calling' ? 'Calling…' : 'Incoming…'}
                        </div>
                    </div>
                )}

                {/* Incoming Call Overlay */}
                {status === 'receiving' && !callAccepted && (
                    <div className="incoming-call-overlay">
                        <div className="incoming-caller-avatar">{remoteInitial}</div>
                        <h3>{callData.name} is calling…</h3>
                        <h3>Incoming {callType === 'video' ? 'Video' : 'Voice'} Call</h3>
                        <div className="call-actions">
                            <button 
                                onClick={answerCall} 
                                className="call-btn accept"
                                disabled={!localStream}
                                style={{ opacity: localStream ? 1 : 0.5, cursor: localStream ? 'pointer' : 'not-allowed' }}
                                title={!localStream ? "Starting camera..." : "Accept"}
                            >
                                <Phone size={24} />
                            </button>
                            <button onClick={rejectCall} className="call-btn reject"><PhoneOff size={24} /></button>
                        </div>
                    </div>
                )}

                {/* Calling Overlay */}
                {status === 'calling' && !callAccepted && (
                    <div className="calling-overlay">
                        <div className="calling-avatar-wrap">
                            <div className="pulse-ring"></div>
                            <div className="incoming-caller-avatar">{remoteInitial}</div>
                        </div>
                        <h3>Calling {remoteUser?.name}…</h3>
                        <button onClick={() => leaveCall(true)} className="call-btn reject" style={{ marginTop: '1.5rem' }}><PhoneOff size={24} /></button>
                    </div>
                )}

                {/* Connected Call Controls */}
                {status === 'connected' && (
                    <div className="active-call-controls">
                        {callType === 'video' && (
                            <div className="call-timer">{formatTime(callDuration)}</div>
                        )}
                        <button onClick={toggleMute} className={`control-btn ${isMuted ? 'disabled' : ''}`} title={isMuted ? 'Unmute' : 'Mute'}>
                            {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                        </button>
                        {callType === 'video' && (
                            <button onClick={toggleVideo} className={`control-btn ${isVideoOff ? 'disabled' : ''}`} title={isVideoOff ? 'Turn On Camera' : 'Turn Off Camera'}>
                                {isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
                            </button>
                        )}
                        {callType === 'video' && !(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) && (
                            <button onClick={toggleScreenShare} className={`control-btn ${isScreenSharing ? 'active' : ''}`} title={isScreenSharing ? 'Stop Sharing' : 'Share Screen'}>
                                {isScreenSharing ? <MonitorOff size={24} /> : <MonitorUp size={24} />}
                            </button>
                        )}
                        <button onClick={() => leaveCall(true)} className="control-btn end-call" title="End Call">
                            <PhoneOff size={20} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VideoCallModal;
