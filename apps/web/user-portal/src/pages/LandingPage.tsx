import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './LandingPage.css';
import LoginModal from '../components/LoginModal';

const LandingPage = () => {
    const [showLogin, setShowLogin] = useState(false);

    return (
        <div className="landing-body">
            <header className="landing-header">
                <Link to="/" className="landing-logo">SmartEdify</Link>
                <button onClick={() => setShowLogin(true)} className="landing-login-button">Login</button>
            </header>
            <main className="landing-main-content">
                <h1>Bienvenido a SmartEdify</h1>
                <p>La plataforma inteligente para la educación del futuro.</p>
            </main>
            {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
        </div>
    );
};

export default LandingPage;
