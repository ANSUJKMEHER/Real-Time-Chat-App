import io from 'socket.io-client';

const URL = 'http://localhost:5000';

export const socket = io(URL, {
    autoConnect: false,
    auth: {
        token: localStorage.getItem('token')
    }
});

export const connectSocket = () => {
    socket.auth.token = localStorage.getItem('token');
    socket.connect();
};

export const disconnectSocket = () => {
    socket.disconnect();
};
