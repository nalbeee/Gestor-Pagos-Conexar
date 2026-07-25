import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { calcularMontoRegistro } from '../../utils/calculos';

export default function EmpleadoSemanal() {
  const [empleados, setEmpleados] = useState([]);
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [pendientes, setPendientes] = useState([]);
  const [isPaying, setIsPaying] = useState(false);

  useEffect(() => {
    supabase.from('empleados').select('id, nombre, apellido').eq('activo', true).order('apellido').then(({ data }) => setEmpleados(data || []));
  }, []);

  useEffect(() => {
    if (selectedEmpId) fetchPendientes();
  }, [selectedEmpId]);

  const fetchPendientes = async () => {
    const { data } = await supabase
      .from('registro_trabajo')
      .select('*, obras(nombre)')
      .eq('empleado_id', selectedEmpId)
      .eq('pagado', false)
      .order('fecha', { ascending: true });
    
    if (data) {
      // Aplicamos la lógica matemática a cada registro
      const procesados = data.map(reg => ({ ...reg, calculos: calcularMontoRegistro(reg) }));
      setPendientes(procesados);
    }
  };

  const totalPagar = pendientes.reduce((acc, curr) => acc + curr.calculos.total, 0);

  const handlePagoRealizado = async () => {
    if (!window.confirm(`¿Confirmas el pago de $${totalPagar.toFixed(2)}?`)) return;
    setIsPaying(true);

    // 1. Crear el registro en el historial de pagos
    const { data: nuevoPago, error: errPago } = await supabase
      .from('historial_pagos')
      .insert([{ empleado_id: selectedEmpId, monto_total: totalPagar }])
      .select().single();

    if (nuevoPago && !errPago) {
      // 2. Marcar todos estos registros como pagados y enlazarlos al pago
      const idsActualizar = pendientes.map(p => p.id);
      await supabase
        .from('registro_trabajo')
        .update({ pagado: true, pago_id: nuevoPago.id })
        .in('id', idsActualizar);
      
      alert('Pago registrado correctamente.');
      fetchPendientes(); // Recarga la tabla (quedará vacía)
    } else {
      alert('Error al registrar pago');
    }
    setIsPaying(false);
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Liquidación Semanal</h1>
        <button className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-200">Historial de Pagos</button>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border mb-6">
        <label className="block text-sm font-bold text-gray-700 mb-2">Seleccionar Empleado</label>
        <select 
          value={selectedEmpId} 
          onChange={(e) => setSelectedEmpId(e.target.value)}
          className="w-full md:w-1/2 p-3 border border-brand-violet rounded-lg focus:ring-brand-violet bg-gray-50"
        >
          <option value="">-- Elige un empleado --</option>
          {empleados.map(emp => <option key={emp.id} value={emp.id}>{emp.apellido}, {emp.nombre}</option>)}
        </select>
      </div>

      {selectedEmpId && (
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h2 className="text-xl font-bold text-brand-violet mb-4">Trabajos Pendientes de Pago</h2>
          
          {pendientes.length === 0 ? (
            <p className="text-gray-500">Este empleado no tiene trabajos pendientes de cobro.</p>
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
                    {pendientes.map(p => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="p-3 font-medium">{new Date(p.fecha + 'T12:00:00').toLocaleDateString()}</td>
                        <td className="p-3">{p.obras.nombre}</td>
                        <td className="p-3">{p.hora_inicio} - {p.hora_fin} {p.de_corrido && <span className="text-xs bg-brand-green text-white px-2 py-1 rounded ml-2">Corrido</span>}</td>
                        <td className="p-3 text-gray-500">
                          ${p.calculos.montoBase.toFixed(0)} / ${p.calculos.montoExtra.toFixed(0)} / ${p.calculos.montoSab.toFixed(0)} / ${p.calculos.montoDom.toFixed(0)}
                        </td>
                        <td className="p-3 text-right font-bold text-gray-800">${p.calculos.total.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col md:flex-row justify-between items-center bg-gray-900 text-white p-6 rounded-xl">
                <div>
                  <p className="text-gray-400 text-sm uppercase">Total Neto a Pagar</p>
                  <p className="text-4xl font-bold text-brand-green">${totalPagar.toFixed(2)}</p>
                </div>
                <button 
                  onClick={handlePagoRealizado}
                  disabled={isPaying}
                  className="mt-4 md:mt-0 bg-brand-violet hover:bg-purple-600 px-8 py-3 rounded-lg font-bold shadow-lg disabled:opacity-50"
                >
                  {isPaying ? 'Procesando...' : 'Marcar como Pago Realizado'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}