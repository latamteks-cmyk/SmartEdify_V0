import React from 'react';
import './Dashboard.css';
import { Link } from 'react-router-dom';

const Dashboard = () => {
    return (
        <div className="dashboard">
            <div className="sidebar">
                <div className="sidebar-header">
                    <span className="sidebar-title">SmartEdify</span>
                </div>
                <nav className="sidebar-menu">
                    <Link to="/dashboard" className="active">Dashboard</Link>
                    <Link to="#">Finanzas</Link>
                    <Link to="#">Mantenimiento</Link>
                    <Link to="#">Comunidad</Link>
                    <Link to="#">Asambleas</Link>
                    <Link to="#">Comunicación</Link>
                    <Link to="#">Proyectos (CAPEX)</Link>
                    <Link to="#">Gestión</Link>
                </nav>
            </div>
            <div className="main-content">
                <header className="header">
                    <div className="header-search">
                        <input type="text" placeholder="Buscar incidencia, activo..." />
                    </div>
                    <div className="header-profile">
                         <span>Admin SmartEdify</span>
                    </div>
                </header>
                
                <h1>Dashboard</h1>

                <div className="kpi-cards">
                    {/* KPI Cards will go here */}
                    <div className="kpi-card">
                        <h4>OTs Completadas</h4>
                        <p>125</p>
                    </div>
                    <div className="kpi-card">
                        <h4>Tiempo de Respuesta (Críticos)</h4>
                        <p>1.5h</p>
                    </div>
                    <div className="kpi-card">
                        <h4>Disponibilidad de Activos Críticos</h4>
                        <p>99.8%</p>
                    </div>
                    <div className="kpi-card">
                        <h4>Costo Promedio por OT</h4>
                        <p>$180</p>
                    </div>
                </div>

                <div className="incidents-table">
                    <h2>Incidencias Recientes</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>INCIDENCIA</th>
                                <th>REPORTADO POR</th>
                                <th>FECHA</th>
                                <th>ESTADO</th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* Incident rows will go here */}
                            <tr>
                                <td>Mancha de humedad en techo de Jardín</td>
                                <td>Sofia Castro</td>
                                <td>15/8/2024</td>
                                <td>Por Procesar</td>
                            </tr>
                            <tr>
                                <td>Luz quemada en pasillo piso 5</td>
                                <td>Laura Mendez</td>
                                <td>14/8/2024</td>
                                <td>Por Procesar</td>
                            </tr>
                            <tr>
                                <td>Ruido extraño en Elevator 1</td>
                                <td>Carlos Vega</td>
                                <td>12/8/2024</td>
                                <td>Asignada</td>
                            </tr>
                             <tr>
                                <td>Baja presión de agua en pisos altos</td>
                                <td>Admin SmartEdify</td>
                                <td>10/8/2024</td>
                                <td>En Ejecución</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
