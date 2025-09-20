import React, { useState } from 'react';
import './LoginModal.css';

interface LoginModalProps {
    onClose: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ onClose }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        // Lógica de autenticación aquí
        console.log('Email:', email, 'Password:', password);
        onClose();
    };

    return (
        <div className="modal-backdrop">
            <div className="modal-content">
                <button onClick={onClose} className="modal-close-button">X</button>
                <h2>Iniciar Sesión</h2>
                <p>Bienvenido de vuelta.</p>
                <form onSubmit={handleLogin}>
                    <div className="form-group">
                        <label htmlFor="email">Correo Electrónico</label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="password">Contraseña</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <div className="forgot-password">
                        <a href="#">¿Olvidaste tu contraseña?</a>
                    </div>
                    <button type="submit" className="login-submit-button">Aceptar</button>
                </form>
            </div>
        </div>
    );
};

export default LoginModal;
