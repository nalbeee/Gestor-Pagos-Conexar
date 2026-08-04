import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { calcularMontoRegistro } from '../../utils/calculos';

export default function EmpleadoSemanal() {
  const [empleados, setEmpleados] = useState([]);
  const [todosPendientes, setTodosPendientes] = useState([]);
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [isPaying, setIsPaying] = useState(false);
  const [loading, setLoading] = useState(true);

  // NUEVOS ESTADOS PARA LOS MODALES DE CONFIRMACIÓN Y ALERTA
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [feedback, setFeedback] = useState(null); // Guardará un objeto: { type: 'success' | 'error', message: '...' }

  useEffect(() => {
    fetchDatosGlobales();
  }, []);

  const fetchDatosGlobales = async () => {
    setLoading(true);
    const { data: dataEmp } = await supabase.from('empleados').select('id, nombre, apellido').eq('activo', true).order('apellido');
    if (dataEmp) setEmpleados(dataEmp);

    const { data: dataRegs } = await supabase
      .from('registro_trabajo')
      .select('*, obras(nombre)')
      .eq('pagado', false)
      .order('fecha', { ascending: true });
    
    if (dataRegs) {
      const procesados = dataRegs.map(reg => ({ ...reg, calculos: calcularMontoRegistro(reg) }));
      setTodosPendientes(procesados);
    }
    setLoading(false);
  };

  const resumenTarjetas = useMemo(() => {
    return empleados.map(emp => {
      const regsEmp = todosPendientes.filter(r => r.empleado_id === emp.id);
      const total = regsEmp.reduce((acc, curr) => acc + curr.calculos.total, 0);
      return { ...emp, totalPendiente: total, cantidadTrabajos: regsEmp.length };
    }).filter(emp => emp.totalPendiente > 0); 
  }, [empleados, todosPendientes]);

  const pendientesDetalle = useMemo(() => {
    return todosPendientes.filter(r => r.empleado_id === selectedEmpId);
  }, [todosPendientes, selectedEmpId]);

  const totalPagarDetalle = pendientesDetalle.reduce((acc, curr) => acc + curr.calculos.total, 0);

  // 1. Abre el modal de confirmación en lugar del mensaje del navegador
  const solicitarConfirmacion = () => {
    setShowConfirmModal(true);
  };

  // 2. Ejecuta el pago real en la base de datos
  const ejecutarPago = async () => {
    setShowConfirmModal(false);
    setIsPaying(true);

    const { data: nuevoPago, error: errPago } = await supabase
      .from('historial_pagos')
      .insert([{ empleado_id: selectedEmpId, monto_total: totalPagarDetalle }])
      .select().single();

    if (nuevoPago && !errPago) {
      const idsActualizar = pendientesDetalle.map(p => p.id);
      await supabase
        .from('registro_trabajo')
        .update({ pagado: true, pago_id: nuevoPago.id })
        .in('id', idsActualizar);
      
      // Mostrar Modal de Éxito en lugar de alert()
      setFeedback({ type: 'success', message: 'El pago ha sido registrado y las horas fueron marcadas como liquidadas.' });
      setSelectedEmpId(''); 
      fetchDatosGlobales(); 
    } else {
      // Mostrar Modal de Error en lugar de alert()
      setFeedback({ type: 'error', message: 'Ocurrió un error al comunicarse con la base de datos. Intenta nuevamente.' });
    }
    setIsPaying(false);
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Cargando tablero financiero...</div>;

  return (
    <div className="max-w-6xl mx-auto pb-20 relative">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Liquidación Semanal</h1>
        <button className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors">
          Historial de Pagos
        </button>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Deudas Activas por Empleado</h2>
        {resumenTarjetas.length === 0 ? (
          <div className="bg-green-50 text-green-700 p-6 rounded-xl border border-green-200 text-center font-medium">
            ¡Excelente! Todos los pagos de los empleados están al día.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {resumenTarjetas.map(emp => (
              <div 
                key={emp.id}
                onClick={() => setSelectedEmpId(emp.id)}
                className={`p-5 rounded-xl border cursor-pointer transition-all transform hover:-translate-y-1 hover:shadow-lg
                  ${selectedEmpId === emp.id 
                    ? 'bg-brand-violet text-white border-brand-violet shadow-md' 
                    : 'bg-white text-gray-800 border-gray-200 hover:border-brand-violet'}
                `}
              >
                <p className={`text-sm font-bold truncate ${selectedEmpId === emp.id ? 'text-purple-200' : 'text-gray-500'}`}>
                  {emp.apellido}, {emp.nombre}
                </p>
                <p className="text-2xl font-bold mt-1">
                  ${emp.totalPendiente.toFixed(2)}
                </p>
                <p className={`text-xs mt-2 ${selectedEmpId === emp.id ? 'text-purple-300' : 'text-gray-400'}`}>
                  {emp.cantidadTrabajos} registros pendientes
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border mb-6">
        <label className="block text-sm font-bold text-gray-700 mb-2">Buscador Manual de Empleados</label>
        <select 
          value={selectedEmpId} 
          onChange={(e) => setSelectedEmpId(e.target.value)}
          className="w-full md:w-1/2 p-3 border border-gray-300 rounded-lg focus:ring-brand-violet bg-gray-50 transition-colors"
        >
          <option value="">-- Elige un empleado para ver el detalle --</option>
          {empleados.map(emp => (
            <option key={emp.id} value={emp.id}>{emp.apellido}, {emp.nombre}</option>
          ))}
        </select>
      </div>

      {selectedEmpId && (
        <div className="bg-white p-6 rounded-xl shadow-sm border animate-fade-in">
          <h2 className="text-xl font-bold text-brand-violet mb-4">Detalle de Trabajos a Liquidar</h2>
          
          {pendientesDetalle.length === 0 ? (
            <p className="text-gray-500 py-4">Este empleado no tiene trabajos pendientes de cobro.</p>
          ) : (
            <>
              <div className="overflow-x-auto mb-6">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="p-3">Fecha</th>
                      <th className="p-3">Obra</th>
                      <th className="p-3">Horario</th>
                      <th className="p-3">Desglose (Base/Ext/Sab/Dom)</th>
                      <th className="p-3 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pendientesDetalle.map(p => (
                      <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-3 font-medium">
                          {new Date(p.fecha + 'T12:00:00').toLocaleDateString()}
                          {p.es_feriado && <span className="ml-2 text-xs text-red-500 font-bold">(Feriado)</span>}
                        </td>
                        <td className="p-3">{p.obras.nombre}</td>
                        <td className="p-3 whitespace-nowrap">
                          {p.hora_inicio} - {p.hora_fin} 
                          {p.de_corrido && <span className="text-xs bg-brand-green text-white px-2 py-1 rounded ml-2">Corrido</span>}
                        </td>
                        <td className="p-3 text-gray-500">
                          ${p.calculos.montoBase.toFixed(0)} / ${p.calculos.montoExtra.toFixed(0)} / ${p.calculos.montoSab.toFixed(0)} / ${p.calculos.montoDom.toFixed(0)}
                        </td>
                        <td className="p-3 text-right font-bold text-gray-800">${p.calculos.total.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col md:flex-row justify-between items-center bg-gray-900 text-white p-6 rounded-xl shadow-md">
                <div>
                  <p className="text-gray-400 text-sm uppercase tracking-wider font-bold">Total Neto a Pagar</p>
                  <p className="text-4xl font-bold text-brand-green">${totalPagarDetalle.toFixed(2)}</p>
                </div>
                <button 
                  onClick={solicitarConfirmacion}
                  disabled={isPaying}
                  className="mt-4 md:mt-0 bg-brand-violet hover:bg-purple-600 px-8 py-3 rounded-lg font-bold shadow-lg transition-transform transform hover:-translate-y-1 disabled:opacity-50 disabled:transform-none"
                >
                  {isPaying ? 'Procesando...' : 'Marcar como Pago Realizado'}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL DE CONFIRMACIÓN */}
      {/* ========================================== */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md text-center transform transition-all scale-100">
            <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Confirmar Liquidación</h2>
            <p className="text-gray-600 mb-8">
              Estás a punto de registrar el pago por <strong className="text-gray-900 text-lg">${totalPagarDetalle.toFixed(2)}</strong>. Los trabajos se marcarán como pagados y el monto ingresará al historial.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <button 
                onClick={() => setShowConfirmModal(false)} 
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-bold hover:bg-gray-200 transition-colors w-full sm:w-auto"
              >
                Cancelar
              </button>
              <button 
                onClick={ejecutarPago} 
                className="px-6 py-3 bg-brand-violet text-white rounded-lg font-bold hover:bg-purple-700 transition-colors shadow-md w-full sm:w-auto"
              >
                Sí, realizar pago
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL DE RESULTADO (FEEDBACK) */}
      {/* ========================================== */}
      {feedback && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm text-center transform transition-all scale-100">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner 
              ${feedback.type === 'success' ? 'bg-green-100 text-brand-green' : 'bg-red-100 text-red-500'}`}
            >
              {feedback.type === 'success' ? (
                 <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
              ) : (
                 <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
              )}
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              {feedback.type === 'success' ? '¡Pago Exitoso!' : 'Error de Sistema'}
            </h2>
            <p className="text-gray-600 mb-8">{feedback.message}</p>
            <button 
              onClick={() => setFeedback(null)} 
              className="w-full py-3 bg-gray-900 text-white rounded-lg font-bold hover:bg-gray-800 transition-colors shadow-md"
            >
              Aceptar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}