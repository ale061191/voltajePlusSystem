'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { RefreshCcw, Power, Search, AlertCircle, CheckCircle } from 'lucide-react';

interface Cabinet {
  id?: string;
  cld?: string;
  pcabinetid?: string;
  name?: string;
  alias?: string;
  online?: boolean;
  pinfostatus?: string;
  pjson?: string;
  transMap?: {
    cdbShopPName?: string;
  };
}

export default function Dashboard() {
  const [cabinets, setCabinets] = useState<Cabinet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  const fetchCabinets = async () => {
    setLoading(true);
    setError('');
    setStatusMsg('');
    try {
      // Usar la ruta proxy verificada
      const res = await axios.get('/api/voltaje/cabinet/list?page=1&limit=20&pProductType=0&dataLevel=1');
      console.log('Respuesta API Cruda:', res.data);

      const list = res.data.data?.records || res.data.page?.records || res.data.list || [];
      setCabinets(list);
      setStatusMsg(`Cargados ${list.length} gabinetes.`);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || err.message || 'Error al obtener datos');
    } finally {
      setLoading(false);
    }
  };

  const handleEject = async (kbId: string) => {
    if (!confirm(`⚠️ ¿ESTÁS SEGURO de que quieres expulsar una batería de ${kbId}?`)) return;

    setStatusMsg(`Enviando comando de expulsión a ${kbId}...`);
    try {
      // Intentar operationType=7 primero como se vio en el navegador
      const res = await axios.get(`/api/voltaje/cabinet/operation?cld=${kbId}&operationType=7`);
      console.log('Respuesta Expulsión:', res.data);

      if (res.data.code === 0 || res.data.msg === 'Successful operation') {
        setStatusMsg(`✅ ÉXITO: ¡Comando enviado a ${kbId}! Revisa la máquina.`);
      } else {
        setStatusMsg(`❌ FALLÓ: ${res.data.msg} (Código: ${res.data.code})`);
      }
    } catch (err: any) {
      console.error(err);
      setStatusMsg(`❌ ERROR DE RED: ${err.message}`);
    }
  };

  useEffect(() => {
    fetchCabinets();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold text-blue-700">Voltaje Admin v2.0</h1>
            <p className="text-gray-500">Panel de Control del Sistema</p>
          </div>
          <button
            onClick={fetchCabinets}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded hover:bg-gray-100 transition disabled:opacity-50"
          >
            <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
            Actualizar Datos
          </button>
        </header>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded border border-red-200 flex items-center gap-3">
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        {statusMsg && (
          <div className={`mb-6 p-4 rounded border flex items-center gap-3 font-medium animate-pulse
            ${statusMsg.includes('FALLÓ') || statusMsg.includes('ERROR') ? 'bg-orange-50 text-orange-800 border-orange-200' :
              statusMsg.includes('ÉXITO') ? 'bg-green-50 text-green-800 border-green-200' : 'bg-blue-50 text-blue-800 border-blue-200'}`}
          >
            {statusMsg.includes('ÉXITO') ? <CheckCircle size={20} /> : <div className="w-2 h-2 rounded-full bg-current" />}
            {statusMsg}
          </div>
        )}

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-100 text-gray-600 uppercase text-sm font-semibold">
              <tr>
                <th className="p-4">Estado</th>
                <th className="p-4">ID Unidad</th>
                <th className="p-4">Nombre / Ubicación</th>
                <th className="p-4">Detalles (Depuración)</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {cabinets.map((cab) => {
                const id = cab.pcabinetid || cab.cld || cab.id || '???';
                const name = cab.transMap?.cdbShopPName || cab.name || cab.alias || 'Sin Nombre';
                const isOnline = cab.online || cab.pinfostatus !== '离线'; // '离线' significa Offline en Chino

                return (
                  <tr key={id} className="hover:bg-blue-50/50 transition">
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${isOnline ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                        {isOnline ? 'EN LÍNEA' : 'DESCONECTADO'}
                      </span>
                    </td>
                    <td className="p-4 font-mono text-blue-600 font-medium">{id}</td>
                    <td className="p-4">{name}</td>
                    <td className="p-4 text-xs font-mono text-gray-400 max-w-xs truncate" title={JSON.stringify(cab, null, 2)}>
                      {JSON.stringify(cab).substring(0, 50)}...
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleEject(id)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 shadow-sm hover:shadow active:scale-95 transition text-sm font-bold"
                      >
                        <Power size={16} />
                        EXPULSAR
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!loading && cabinets.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-gray-400 italic">
                    No se encontraron gabinetes. Verifica la conexión o credenciales.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
