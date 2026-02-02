import React, { useState, useEffect, useMemo, Fragment } from 'react';
import { ImageEditor } from './components/ImageEditor';

// Versão do sistema - gerada automaticamente no build
const APP_VERSION = import.meta.env.VITE_APP_VERSION || '0.1.0-dev';
const APP_BUILD_DATE = import.meta.env.VITE_BUILD_DATE || new Date().toISOString().split('T')[0];
const APP_BUILD_TIME = import.meta.env.VITE_BUILD_TIME || new Date().toTimeString().split(' ')[0];

// Componente Modal de Pagamento
function PaymentModal({ installment, onConfirm, onClose }: Readonly<{ 
  installment: { id: number; sequence: number; amount: number; sale: { itemName: string; client?: { name: string } } };
  onConfirm: (id: number, paidAt: string) => void;
  onClose: () => void;
}>) {
  const [paidAt, setPaidAt] = useState(new Date().toISOString().split('T')[0]);
  const handleOverlayKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClose();
    }
  };
  
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="button"
      tabIndex={0}
      aria-label="Fechar modal de pagamento"
      onKeyDown={handleOverlayKey}
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-md w-full"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white p-6 rounded-t-xl">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold">💰 Registrar Pagamento</h2>
              <p className="text-sm mt-1 opacity-90">Parcela {installment.sequence}</p>
            </div>
            <button onClick={onClose} className="text-2xl hover:opacity-70">×</button>
          </div>
        </div>

        <div className="p-6">
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <p className="font-semibold text-gray-800">👤 {installment.sale.client?.name || 'Cliente'}</p>
            <p className="text-sm text-gray-600 mt-1">💎 {installment.sale.itemName}</p>
            <p className="font-bold text-green-600 text-lg mt-2">{formatCurrency(installment.amount)}</p>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">📅 Data do Pagamento</label>
            <input
              type="date"
              value={paidAt}
              onChange={(e) => setPaidAt(e.target.value)}
              className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 p-3 rounded-lg font-semibold transition"
            >
              Cancelar
            </button>
            <button
              onClick={() => onConfirm(installment.id, paidAt)}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white p-3 rounded-lg font-semibold transition"
            >
              ✅ Confirmar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Componente Modal de Compartilhamento de Carnê
function ShareCarneModal({ sale, client, onClose }: Readonly<{ sale: any; client: any; onClose: () => void }>) {
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const generateCarneText = () => {
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    let text = `💎 *VANI E ELO JOIAS*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    text += `👤 *Cliente:* ${client.name}\n`;
    text += `💍 *Peça:* ${sale.itemName}\n`;
    if (sale.itemCode) text += `📦 *Código:* ${sale.itemCode}\n`;
    text += `💰 *Valor Total:* ${formatCurrency(sale.totalValue)}\n`;
    text += `📊 *Parcelas:* ${sale.installments || sale.installmentsR?.length || 1}x\n\n`;
    
    if (sale.installmentsR && sale.installmentsR.length > 0) {
      text += `📅 *Parcelas:*\n`;
      sale.installmentsR.forEach((inst: any, idx: number) => {
        const date = new Date(inst.dueDate);
        const monthName = months[date.getMonth()];
        const status = inst.paid ? '✅' : '⏳';
        text += `${status} ${idx + 1}ª - ${monthName}/${date.getFullYear()} - ${formatCurrency(inst.amount)}\n`;
      });
    }
    
    text += `\n━━━━━━━━━━━━━━━━━━━━`;
    return text;
  };

  const sendWhatsApp = () => {
    const text = generateCarneText();
    const phone = client.phone?.replaceAll(/\D/g, '') || '';
    const url = phone 
      ? `https://wa.me/55${phone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const copyToClipboard = () => {
    const text = generateCarneText();
    navigator.clipboard.writeText(text);
    alert('📋 Texto copiado para a área de transferência!');
  };

  const printCarne = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    let rows = '';
    if (sale.installmentsR) {
      sale.installmentsR.forEach((inst: any, idx: number) => {
        const date = new Date(inst.dueDate);
        rows += `<tr>
          <td>${idx + 1}ª</td>
          <td>${months[date.getMonth()]}/${date.getFullYear()}</td>
          <td>${formatCurrency(inst.amount)}</td>
          <td>${inst.paid ? '✅ Pago' : '⏳ Pendente'}</td>
        </tr>`;
      });
    }
    
    win.document.write(`<!doctype html><html><head><title>Carnê - ${client.name}</title><style>
      body { font-family: Arial, sans-serif; padding: 20px; }
      table { width: 100%; border-collapse: collapse; margin-top: 20px; }
      th, td { border: 1px solid #ccc; padding: 10px; text-align: left; }
      th { background: #f0f0f0; }
      h1 { color: #7c3aed; }
    </style></head><body>
    <h1>💎 Vani e Elo Joias</h1>
    <p><strong>Cliente:</strong> ${client.name}</p>
    <p><strong>Peça:</strong> ${sale.itemName}</p>
    <p><strong>Valor Total:</strong> ${formatCurrency(sale.totalValue)}</p>
    <table>
      <thead><tr><th>Parcela</th><th>Vencimento</th><th>Valor</th><th>Status</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <script>window.onload = () => setTimeout(() => window.print(), 400);</script>
    </body></html>`);
    win.document.close();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-800">📤 Compartilhar Carnê</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <p className="font-semibold text-gray-800">👤 {client.name}</p>
          <p className="text-sm text-gray-600">💎 {sale.itemName}</p>
          <p className="font-bold text-green-600">{formatCurrency(sale.totalValue)}</p>
        </div>
        
        <div className="space-y-3">
          <button
            onClick={sendWhatsApp}
            className="w-full bg-green-500 hover:bg-green-600 text-white p-4 rounded-lg font-semibold flex items-center justify-center gap-2 transition"
          >
            <span className="text-xl">📱</span>
            Enviar via WhatsApp
          </button>
          
          {sale.photoUrl && (
            <button
              onClick={async () => {
                const filename = sale.photoUrl.split('/').pop();
                const downloadUrl = `/api/download/${filename}`;
                const text = `📸 *Foto da Peça* 📸\n\n💍 *${sale.itemName}*\n${sale.itemCode ? `📦 Código: ${sale.itemCode}\n` : ''}💰 Valor: *${formatCurrency(sale.totalValue)}*`;
                const phone = client.phone?.replaceAll(/\D/g, '') || '';
                
                try {
                  const res = await fetch(downloadUrl);
                  const blob = await res.blob();
                  const shareFile = new File([blob], `foto-${sale.itemName.replace(/\s+/g, '-')}.jpg`, { type: 'image/jpeg' });
                  if (navigator.canShare && navigator.canShare({ files: [shareFile] })) {
                    await navigator.share({ files: [shareFile], text });
                    return;
                  }
                } catch (err) {
                  console.warn('Web Share API falhou, usando fallback:', err);
                }
                
                const downloadLink = document.createElement('a');
                downloadLink.href = downloadUrl;
                downloadLink.download = `foto-${sale.itemName.replace(/\s+/g, '-')}.jpg`;
                document.body.appendChild(downloadLink);
                downloadLink.click();
                document.body.removeChild(downloadLink);
                
                setTimeout(() => {
                  const url = `https://wa.me/55${phone}?text=${encodeURIComponent(text)}`;
                  window.open(url, '_blank');
                }, 500);
              }}
              className="w-full bg-cyan-500 hover:bg-cyan-600 text-white p-4 rounded-lg font-semibold flex items-center justify-center gap-2 transition"
            >
              <span className="text-xl">📸</span>
              Enviar Foto + Carnê
            </button>
          )}
          
          <button
            onClick={copyToClipboard}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white p-4 rounded-lg font-semibold flex items-center justify-center gap-2 transition"
          >
            <span className="text-xl">📋</span>
            Copiar Texto
          </button>
          
          <button
            onClick={printCarne}
            className="w-full bg-purple-500 hover:bg-purple-600 text-white p-4 rounded-lg font-semibold flex items-center justify-center gap-2 transition"
          >
            <span className="text-xl">🖨️</span>
            Imprimir / Salvar PDF
          </button>
          
          <button
            onClick={onClose}
            className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 p-4 rounded-lg font-semibold transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

// Componente Modal de Carnê de Parcelas
function CarneModal({ client, sales, onClose, onMarkPaid, onUpdateClient, token }: Readonly<{ client: any, sales: any[], onClose: () => void, onMarkPaid?: (inst: any) => void, onUpdateClient?: (clientId: number, data: any) => Promise<void>, token?: string }>) {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: client.name || '',
    phone: client.phone || '',
    cpf: client.cpf || '',
    rg: client.rg || '',
    city: client.city || '',
    address: client.address || '',
    billingAddress: client.billingAddress || '',
    profession: client.profession || '',
    workPhone: client.workPhone || '',
    workAddress: client.workAddress || ''
  });
  const [editingPaymentDate, setEditingPaymentDate] = useState<any>(null);
  const [editingSale, setEditingSale] = useState<any>(null);
  const [newPaymentDate, setNewPaymentDate] = useState('');
  
  // Estados para formulário de edição de venda
  const [editSaleForm, setEditSaleForm] = useState({
    itemName: '',
    itemCode: '',
    totalValue: '',
    observations: '',
    sellerName: '',
    isExchange: false
  });
  const [editInstallments, setEditInstallments] = useState<{id: number, amount: string, dueDate: string, paid: boolean, sequence: number}[]>([]);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  
  // Estados para renegociação
  const [showRenegotiate, setShowRenegotiate] = useState(false);
  const [renegotiateForm, setRenegotiateForm] = useState({ totalValue: '', installments: '1', startDate: '' });
  const [isRenegotiating, setIsRenegotiating] = useState(false);
  
  // Função para renegociar (adicionar parcelas)
  const handleRenegotiate = async () => {
    if (!editingSale || !token) return;
    
    const totalValue = parseFloat(renegotiateForm.totalValue);
    const installments = parseInt(renegotiateForm.installments);
    
    if (!totalValue || totalValue <= 0 || !installments || installments < 1 || !renegotiateForm.startDate) {
      alert('Preencha todos os campos corretamente');
      return;
    }
    
    setIsRenegotiating(true);
    try {
      const res = await fetch(`${API_URL}/sales/${editingSale.id}/renegotiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          totalValue,
          newInstallments: installments,
          startDate: renegotiateForm.startDate
        })
      });
      
      if (!res.ok) {
        throw new Error('Erro ao renegociar');
      }
      
      alert('✅ Renegociação realizada com sucesso!');
      setShowRenegotiate(false);
      setRenegotiateForm({ totalValue: '', installments: '1', startDate: '' });
      setEditingSale(null);
      onUpdate();
    } catch (error) {
      console.error('Erro ao renegociar:', error);
      alert('❌ Erro ao renegociar venda');
    } finally {
      setIsRenegotiating(false);
    }
  };
  
  // Atualizar formulário quando editingSale mudar
  useEffect(() => {
    if (editingSale) {
      setEditSaleForm({
        itemName: editingSale.itemName || '',
        itemCode: editingSale.itemCode || '',
        totalValue: String(editingSale.totalValue || 0),
        observations: editingSale.observations || '',
        sellerName: editingSale.sellerName || '',
        isExchange: editingSale.isExchange || false
      });
      // Popular parcelas para edição
      if (editingSale.installmentsR) {
        setEditInstallments(editingSale.installmentsR.map((inst: any) => ({
          id: inst.id,
          amount: String(inst.amount),
          dueDate: new Date(inst.dueDate).toISOString().split('T')[0],
          paid: inst.paid,
          sequence: inst.sequence
        })));
      }
    }
  }, [editingSale]);
  
  // Função para salvar edição da venda
  const handleSaveEditSale = async () => {
    if (!editingSale || !token) return;
    
    setIsSavingEdit(true);
    try {
      // Primeiro salvar a venda
      const res = await fetch(`${API_URL}/sales/${editingSale.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          itemName: editSaleForm.itemName,
          itemCode: editSaleForm.itemCode || null,
          totalValue: parseFloat(editSaleForm.totalValue),
          observations: editSaleForm.observations || null,
          sellerName: editSaleForm.sellerName || null,
          isExchange: editSaleForm.isExchange
        })
      });
      
      if (!res.ok) {
        const data = await res.json();
        alert(`❌ Erro: ${data.error || 'Falha ao atualizar venda'}`);
        return;
      }
      
      // Depois salvar as parcelas modificadas (somente não pagas)
      const unpaidInstallments = editInstallments.filter(i => !i.paid);
      for (const inst of unpaidInstallments) {
        await fetch(`${API_URL}/installments/${inst.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            amount: parseFloat(inst.amount),
            dueDate: inst.dueDate
          })
        });
      }
      
      alert('✅ Venda e parcelas atualizadas com sucesso!');
      setEditingSale(null);
      window.location.reload();
    } catch (err) {
      alert('❌ Erro ao atualizar venda');
      console.error(err);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleSaveEdit = async () => {
    if (onUpdateClient) {
      await onUpdateClient(client.id, editForm);
      setIsEditing(false);
    }
  };

  const handleUpdatePaymentDate = async () => {
    if (!newPaymentDate || !token) {
      alert('Selecione uma data válida!');
      return;
    }

    try {
      const res = await fetch(`/api/sales/${editingPaymentDate.id}/update-payment-date`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          firstPaymentDate: newPaymentDate
        })
      });

      if (res.ok) {
        // Recarregar a página ou atualizar os dados
        window.location.reload();
      } else {
        const error = await res.json();
        alert(`Erro ao atualizar: ${error.error || 'Erro desconhecido'}`);
      }
    } catch (error) {
      console.error('Erro ao atualizar data:', error);
      alert('Erro ao atualizar data de pagamento');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  // Agrupar parcelas por ano
  const groupInstallmentsByYear = (installments: any[]) => {
    const grouped: { [year: number]: any[] } = {};
    installments.forEach(inst => {
      const year = new Date(inst.dueDate).getFullYear();
      if (!grouped[year]) grouped[year] = [];
      grouped[year].push(inst);
    });
    return grouped;
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="button"
      tabIndex={0}
      aria-label="Fechar carnê"
      onKeyDown={(e) => {
        if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClose();
        }
      }}
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6 rounded-t-xl">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h2 className="text-2xl font-bold">💎 Vani e Elo Joias</h2>
              {isEditing ? (
                <div className="mt-3 space-y-2">
                  <input 
                    type="text" 
                    placeholder="Nome" 
                    value={editForm.name}
                    onChange={e => setEditForm({...editForm, name: e.target.value})}
                    className="w-full p-2 rounded text-gray-800 text-sm"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input 
                      type="text" 
                      placeholder="Telefone" 
                      value={editForm.phone}
                      onChange={e => setEditForm({...editForm, phone: e.target.value})}
                      className="p-2 rounded text-gray-800 text-sm"
                    />
                    <input 
                      type="text" 
                      placeholder="CPF" 
                      value={editForm.cpf}
                      onChange={e => setEditForm({...editForm, cpf: e.target.value})}
                      className="p-2 rounded text-gray-800 text-sm"
                    />
                    <input 
                      type="text" 
                      placeholder="RG" 
                      value={editForm.rg}
                      onChange={e => setEditForm({...editForm, rg: e.target.value})}
                      className="p-2 rounded text-gray-800 text-sm"
                    />
                    <input 
                      type="text" 
                      placeholder="Cidade" 
                      value={editForm.city}
                      onChange={e => setEditForm({...editForm, city: e.target.value})}
                      className="p-2 rounded text-gray-800 text-sm"
                    />
                  </div>
                  <textarea 
                    placeholder="Endereço" 
                    value={editForm.address}
                    onChange={e => setEditForm({...editForm, address: e.target.value})}
                    className="w-full p-2 rounded text-gray-800 text-sm h-16"
                  />
                  <textarea 
                    placeholder="Endereço de cobrança" 
                    value={editForm.billingAddress}
                    onChange={e => setEditForm({...editForm, billingAddress: e.target.value})}
                    className="w-full p-2 rounded text-gray-800 text-sm h-16"
                  />
                  <input 
                    type="text" 
                    placeholder="Profissão" 
                    value={editForm.profession}
                    onChange={e => setEditForm({...editForm, profession: e.target.value})}
                    className="w-full p-2 rounded text-gray-800 text-sm"
                  />
                  <input 
                    type="tel" 
                    placeholder="Telefone do Local de Trabalho" 
                    value={editForm.workPhone}
                    onChange={e => setEditForm({...editForm, workPhone: e.target.value})}
                    className="w-full p-2 rounded text-gray-800 text-sm"
                  />
                  <textarea 
                    placeholder="Endereço do Local de Trabalho" 
                    value={editForm.workAddress}
                    onChange={e => setEditForm({...editForm, workAddress: e.target.value})}
                    className="w-full p-2 rounded text-gray-800 text-sm h-16"
                  />
                  <div className="flex gap-2 mt-2">
                    <button 
                      onClick={handleSaveEdit}
                      className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded text-sm font-semibold"
                    >
                      ✓ Salvar
                    </button>
                    <button 
                      onClick={() => setIsEditing(false)}
                      className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-lg mt-2">Cliente: <strong>{client.name}</strong></p>
                  <p className="text-sm opacity-80">📱 {client.phone}</p>
                  {client.cpf && <p className="text-sm opacity-80">📄 CPF: {client.cpf}</p>}
                  {client.rg && <p className="text-sm opacity-80">🪪 RG: {client.rg}</p>}
                  {client.city && <p className="text-sm opacity-80">🏙️ {client.city}</p>}
                  {client.address && <p className="text-sm opacity-80">📍 {client.address}</p>}
                  {client.billingAddress && <p className="text-sm opacity-80">💳 Cobrança: {client.billingAddress}</p>}
                  {client.profession && <p className="text-sm opacity-80">💼 Profissão: {client.profession}</p>}
                  {client.workPhone && <p className="text-sm opacity-80">☎️ Tel. Trabalho: {client.workPhone}</p>}
                  {client.workAddress && <p className="text-sm opacity-80">🏢 End. Trabalho: {client.workAddress}</p>}
                  {onUpdateClient && (
                    <button 
                      onClick={() => setIsEditing(true)}
                      className="mt-2 bg-white/20 hover:bg-white/30 px-3 py-1 rounded text-sm"
                    >
                      ✏️ Editar Cliente
                    </button>
                  )}
                </>
              )}
            </div>
            <button onClick={onClose} className="text-3xl hover:opacity-70 ml-4">×</button>
          </div>
        </div>

        {/* Resumo */}
        <div className="p-6 bg-gray-50 border-b">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-sm text-gray-500">Total de Vendas</p>
              <p className="text-2xl font-bold text-purple-600">{sales.length}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-sm text-gray-500">Valor Total</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(sales.reduce((sum, s) => sum + s.totalValue, 0))}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-sm text-gray-500">Parcelas Pagas</p>
              <p className="text-xl font-bold text-blue-600">
                {sales.reduce((sum, s) => sum + (s.installmentsR?.filter((i: any) => i.paid).length || 0), 0)}
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-sm text-gray-500">Parcelas Pendentes</p>
              <p className="text-xl font-bold text-orange-600">
                {sales.reduce((sum, s) => sum + (s.installmentsR?.filter((i: any) => !i.paid).length || 0), 0)}
              </p>
            </div>
          </div>
        </div>

        {/* Carnês por Venda */}
        <div className="p-6 space-y-6">
          {sales.map((sale: any) => {
            const installmentsByYear = groupInstallmentsByYear(sale.installmentsR || []);
            const years = Object.keys(installmentsByYear).map(Number).sort((a, b) => a - b);
            
            return (
              <div key={sale.id} className={`border-2 rounded-xl overflow-hidden ${sale.isExchange ? 'border-orange-400 bg-orange-50' : 'border-gray-200'}`}>
                {/* Cabeçalho da Venda */}
                <div className={`p-4 border-b ${sale.isExchange ? 'bg-orange-100' : 'bg-purple-100'}`}>
                  <div className="flex justify-between items-start flex-wrap gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-lg text-gray-800">💎 {sale.itemName}</h3>
                        {sale.isExchange && (
                          <span className="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                            🔄 TROCA
                          </span>
                        )}
                      </div>
                      {sale.itemCode && <p className="text-sm text-gray-600">Código: {sale.itemCode}</p>}
                      {sale.installmentsR && sale.installmentsR.length > 0 && (
                        <p className="text-xs text-blue-600 mt-1">
                          📅 Primeiro pagamento: {new Date(sale.installmentsR[0].dueDate).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                        </p>
                      )}
                    </div>
                    <div className="text-right flex items-start gap-2">
                      <div>
                        <p className="text-sm text-gray-600">Data: {new Date(sale.saleDate).toLocaleDateString('pt-BR')}</p>
                        <p className="font-bold text-green-600">{formatCurrency(sale.totalValue)}</p>
                        {sale.factor && <p className="text-xs text-gray-500">Fator: {sale.factor} | Base: {formatCurrency(sale.baseValue)}</p>}
                      </div>
                      {sale.installmentsR && sale.installmentsR.length > 1 && token && (
                        <button
                          onClick={() => {
                            setEditingPaymentDate(sale);
                            const firstDue = new Date(sale.installmentsR[0].dueDate);
                            setNewPaymentDate(`${firstDue.getFullYear()}-${String(firstDue.getMonth() + 1).padStart(2, '0')}`);
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-200 rounded transition"
                          title="Editar data do primeiro pagamento"
                        >
                          📅
                        </button>
                      )}
                      <button
                        onClick={() => setEditingSale(sale)}
                        className="p-2 text-yellow-600 hover:bg-yellow-200 rounded transition"
                        title="Editar venda"
                      >
                        ✏️
                      </button>
                    </div>
                  </div>
                </div>

                {/* Carnê de Parcelas - Estilo igual ao papel */}
                <div className="p-4">
                  <h4 className="font-bold text-center text-gray-800 mb-4 text-lg border-b-2 border-gray-300 pb-2">
                    CONTROLE DE PARCELAS
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {years.map(year => (
                      <div key={year} className="border rounded-lg overflow-hidden">
                        <div className="bg-gray-100 p-2 font-bold text-center border-b">
                          ANO: {year}
                        </div>
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="text-left p-2 border-b">Mês</th>
                              <th className="text-right p-2 border-b">R$</th>
                              <th className="text-center p-2 border-b">PAGO</th>
                            </tr>
                          </thead>
                          <tbody>
                            {months.map((monthName) => {
                              const monthIndex = months.indexOf(monthName);
                              const inst = installmentsByYear[year]?.find((i: any) => 
                                new Date(i.dueDate).getMonth() === monthIndex
                              );
                              const rowClass = inst ? (inst.paid ? 'bg-green-50' : 'bg-white') : 'bg-gray-50';
                              const monthLabel = monthName.substring(0, 3);
                              const statusCell = (() => {
                                if (!inst) return '';
                                if (inst.paid) {
                                  const paidTitle = inst.paidAt ? `Pago em ${new Date(inst.paidAt).toLocaleDateString('pt-BR')}` : 'Pago';
                                  return <span className="text-green-600 font-bold" title={paidTitle}>✓</span>;
                                }
                                if (onMarkPaid) {
                                  return (
                                    <button 
                                      onClick={() => onMarkPaid(inst)}
                                      className="text-gray-400 hover:text-green-500 transition"
                                      title="Marcar como pago"
                                    >
                                      ○
                                    </button>
                                  );
                                }
                                return <span className="text-gray-300">○</span>;
                              })();

                              return (
                                <tr key={monthName} className={rowClass}>
                                  <td className="p-2 border-b">{monthLabel}</td>
                                  <td className="p-2 border-b text-right font-mono">
                                    {inst ? formatCurrency(inst.amount).replace('R$', '').trim() : '—'}
                                  </td>
                                  <td className="p-2 border-b text-center">{statusCell}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}

          {sales.length === 0 && (
            <p className="text-center text-gray-500 py-8">Nenhuma venda registrada para este cliente</p>
          )}
        </div>

        {/* Modal de Edição de Data de Pagamento */}
        {editingPaymentDate && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
              <h3 className="text-xl font-bold text-gray-800 mb-4">📅 Editar Data de Pagamento</h3>
              <p className="text-sm text-gray-600 mb-4">
                Venda: <span className="font-semibold">{editingPaymentDate.itemName}</span>
              </p>
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Primeiro mês de pagamento
                </label>
                <input
                  type="month"
                  value={newPaymentDate}
                  onChange={(e) => setNewPaymentDate(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-purple-600 focus:outline-none"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setEditingPaymentDate(null);
                    setNewPaymentDate('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition font-semibold"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleUpdatePaymentDate}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold"
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Edição de Venda */}
        {editingSale && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setEditingSale(null)}>
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 relative" onClick={e => e.stopPropagation()}>
              <button
                onClick={() => setEditingSale(null)}
                className="absolute top-2 right-2 text-2xl text-gray-400 hover:text-gray-700"
                title="Fechar"
              >×</button>
              <h2 className="text-2xl font-bold mb-4 text-purple-700">✏️ Editar Venda</h2>
              
              <div className="bg-gray-100 rounded-lg p-3 mb-4 text-sm">
                <p className="text-gray-600">👤 Cliente: <span className="font-semibold">{client.name}</span></p>
                <p className="text-gray-600">📅 Data: {new Date(editingSale.saleDate).toLocaleDateString('pt-BR')}</p>
              </div>
              
              {/* Formulário de Edição */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">💎 Nome do Item *</label>
                  <input
                    type="text"
                    value={editSaleForm.itemName}
                    onChange={e => setEditSaleForm({...editSaleForm, itemName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Ex: Anel de Ouro"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">📦 Código</label>
                    <input
                      type="text"
                      value={editSaleForm.itemCode}
                      onChange={e => setEditSaleForm({...editSaleForm, itemCode: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Código do item"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">💰 Valor Total *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editSaleForm.totalValue}
                      onChange={e => setEditSaleForm({...editSaleForm, totalValue: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="0,00"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">👤 Vendedor</label>
                  <input
                    type="text"
                    value={editSaleForm.sellerName}
                    onChange={e => setEditSaleForm({...editSaleForm, sellerName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Nome do vendedor"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">📝 Observações</label>
                  <textarea
                    value={editSaleForm.observations}
                    onChange={e => setEditSaleForm({...editSaleForm, observations: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    rows={2}
                    placeholder="Observações sobre a venda"
                  />
                </div>
                
                <div className="flex items-center gap-3 bg-orange-50 p-3 rounded-lg border border-orange-200">
                  <input
                    type="checkbox"
                    id="editIsExchange"
                    checked={editSaleForm.isExchange}
                    onChange={e => setEditSaleForm({...editSaleForm, isExchange: e.target.checked})}
                    className="w-5 h-5 text-orange-500 rounded focus:ring-orange-500"
                  />
                  <label htmlFor="editIsExchange" className="text-sm font-semibold text-orange-700 cursor-pointer">
                    🔄 Esta é uma TROCA
                  </label>
                </div>
                
                {/* Edição de Parcelas */}
                {editInstallments.length > 0 && (
                  <div className="border-t pt-4 mt-4">
                    <h3 className="font-semibold text-gray-700 mb-3">📅 Parcelas ({editInstallments.filter(i => !i.paid).length} restantes)</h3>
                    <div className="max-h-48 overflow-y-auto space-y-2">
                      {editInstallments.map((inst, idx) => (
                        <div key={inst.id} className={`flex items-center gap-2 p-2 rounded ${inst.paid ? 'bg-green-50 opacity-60' : 'bg-gray-50'}`}>
                          <span className="w-8 text-center text-xs font-bold text-gray-500">{inst.sequence}ª</span>
                          <input
                            type="number"
                            step="0.01"
                            value={inst.amount}
                            onChange={e => {
                              const newInst = [...editInstallments];
                              newInst[idx].amount = e.target.value;
                              setEditInstallments(newInst);
                            }}
                            disabled={inst.paid}
                            className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-purple-500 disabled:bg-gray-200"
                            placeholder="Valor"
                          />
                          <input
                            type="date"
                            value={inst.dueDate}
                            onChange={e => {
                              const newInst = [...editInstallments];
                              newInst[idx].dueDate = e.target.value;
                              setEditInstallments(newInst);
                            }}
                            disabled={inst.paid}
                            className="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-purple-500 disabled:bg-gray-200"
                          />
                          {inst.paid && <span className="text-green-600 text-xs font-bold">✓ PAGA</span>}
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      💡 Apenas parcelas não pagas podem ser editadas
                    </p>
                  </div>
                )}
                
                {/* Seção de Renegociação */}
                <div className="border-t pt-4 mt-4">
                  <button
                    onClick={() => setShowRenegotiate(!showRenegotiate)}
                    className="w-full bg-blue-100 hover:bg-blue-200 text-blue-700 px-4 py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2"
                  >
                    🔄 {showRenegotiate ? 'Fechar Renegociação' : 'Renegociar / Adicionar Parcelas'}
                  </button>
                  
                  {showRenegotiate && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <h4 className="font-semibold text-blue-800 mb-3">➕ Adicionar Novas Parcelas</h4>
                      <p className="text-xs text-blue-600 mb-3">Adicione valor extra dividido em novas parcelas (isso NÃO altera as parcelas existentes)</p>
                      
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-semibold text-blue-700 mb-1">💰 Valor a Adicionar</label>
                          <input
                            type="number"
                            step="0.01"
                            value={renegotiateForm.totalValue}
                            onChange={e => setRenegotiateForm({...renegotiateForm, totalValue: e.target.value})}
                            className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Ex: 500.00"
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-semibold text-blue-700 mb-1">📊 Qtd. Parcelas</label>
                            <input
                              type="number"
                              min="1"
                              value={renegotiateForm.installments}
                              onChange={e => setRenegotiateForm({...renegotiateForm, installments: e.target.value})}
                              className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Ex: 3"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-blue-700 mb-1">📅 Início</label>
                            <input
                              type="date"
                              value={renegotiateForm.startDate}
                              onChange={e => setRenegotiateForm({...renegotiateForm, startDate: e.target.value})}
                              className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                        </div>
                        
                        {renegotiateForm.totalValue && renegotiateForm.installments && (
                          <p className="text-sm text-blue-700 bg-blue-100 p-2 rounded">
                            📌 Cada nova parcela: <strong>R$ {(parseFloat(renegotiateForm.totalValue || '0') / parseInt(renegotiateForm.installments || '1')).toFixed(2)}</strong>
                          </p>
                        )}
                        
                        <button
                          onClick={handleRenegotiate}
                          disabled={isRenegotiating || !renegotiateForm.totalValue || !renegotiateForm.startDate}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-semibold transition disabled:opacity-50"
                        >
                          {isRenegotiating ? '⏳ Processando...' : '✅ Confirmar Renegociação'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setEditingSale(null)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-3 rounded-lg font-semibold transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveEditSale}
                  disabled={isSavingEdit || !editSaleForm.itemName || !editSaleForm.totalValue}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-semibold transition disabled:opacity-50"
                >
                  {isSavingEdit ? '⏳ Salvando...' : '✅ Salvar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Componente de Scroll to Top
function ScrollToTop() {
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.pageYOffset > 300) {
        setShowButton(true);
      } else {
        setShowButton(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      {showButton && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 bg-purple-600 text-white p-4 rounded-full shadow-lg hover:bg-purple-700 transition z-50"
          title="Voltar ao topo"
        >
          ⬆️
        </button>
      )}
    </>
  );
}

export default function App() {
  // [No topo do componente App ou onde ficam os useState globais]
  const [editingSale, setEditingSale] = useState<any>(null);
  
  // Estados para formulário de edição de venda global
  const [editSaleFormGlobal, setEditSaleFormGlobal] = useState({
    itemName: '',
    itemCode: '',
    totalValue: '',
    observations: '',
    sellerName: '',
    isExchange: false
  });
  const [editInstallmentsGlobal, setEditInstallmentsGlobal] = useState<{id: number, amount: string, dueDate: string, paid: boolean, sequence: number}[]>([]);
  const [isSavingEditGlobal, setIsSavingEditGlobal] = useState(false);
  
  // Estados de renegociação global
  const [showRenegotiateGlobal, setShowRenegotiateGlobal] = useState(false);
  const [renegotiateFormGlobal, setRenegotiateFormGlobal] = useState({ totalValue: '', installments: '1', startDate: '' });
  const [isRenegotiatingGlobal, setIsRenegotiatingGlobal] = useState(false);

  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [loggedEmail, setLoggedEmail] = useState(localStorage.getItem('loggedEmail') || '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [page, setPage] = useState('dashboard');
  const [stats, setStats] = useState<any>(null);
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [pendingInstallments, setPendingInstallments] = useState<any[]>([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState<number[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [filteredClients, setFilteredClients] = useState<any[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClientForModal, setSelectedClientForModal] = useState<any>(null);
  const [clientSalesForModal, setClientSalesForModal] = useState<any[]>([]);
  const [paymentModalInstallment, setPaymentModalInstallment] = useState<any>(null);
  
  // Estados para modais de estatísticas
  const [statsModal, setStatsModal] = useState<string | null>(null);
  const [allSales, setAllSales] = useState<any[]>([]);
  const [allExpenses, setAllExpenses] = useState<any[]>([]);
  const [forecastData, setForecastData] = useState<{ month: string; value: number; accumulated: number; installments?: any[] }[]>([]);
  const [forecastDataNextYear, setForecastDataNextYear] = useState<{ month: string; value: number; accumulated: number; installments?: any[] }[]>([]);
  const [forecastYear, setForecastYear] = useState<number>(new Date().getFullYear());
  const [forecastYears, setForecastYears] = useState<number[]>([]);
  const [pendingInstallmentsAll, setPendingInstallmentsAll] = useState<any[]>([]);
  const [monthlyRevenueByYear, setMonthlyRevenueByYear] = useState<Record<number, number[]>>({});
  const [monthlyRevenueYear, setMonthlyRevenueYear] = useState<number>(new Date().getFullYear());
  const [monthlyRevenueYears, setMonthlyRevenueYears] = useState<number[]>([]);
  const [shareModalData, setShareModalData] = useState<{ sale: any; client: any; message?: string } | null>(null);
  const [editingInstallment, setEditingInstallment] = useState<any>(null);
  const [expandedMonths, setExpandedMonths] = useState<number[]>([]);
  
  // Estados para criar cliente na página Clientes
  const [showCreateClientModal, setShowCreateClientModal] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientCpf, setNewClientCpf] = useState('');
  const [newClientRg, setNewClientRg] = useState('');
  const [newClientCity, setNewClientCity] = useState('');
  const [newClientAddress, setNewClientAddress] = useState('');
  const [newClientBillingAddress, setNewClientBillingAddress] = useState('');
  const [newClientProfession, setNewClientProfession] = useState('');
  const [newClientWorkPhone, setNewClientWorkPhone] = useState('');
  const [newClientWorkAddress, setNewClientWorkAddress] = useState('');

  useEffect(() => {
    if (token && page === 'dashboard') {
      loadDashboard();
    }
    if (token && page === 'clientes') {
      loadClients();
    }
    if (token && (page === 'vendas' || page === 'clientes')) {
      loadClients();
    }
  }, [token, page]);
  
  // Atualizar formulário global quando editingSale mudar
  useEffect(() => {
    if (editingSale) {
      setEditSaleFormGlobal({
        itemName: editingSale.itemName || '',
        itemCode: editingSale.itemCode || '',
        totalValue: String(editingSale.totalValue || 0),
        observations: editingSale.observations || '',
        sellerName: editingSale.sellerName || '',
        isExchange: editingSale.isExchange || false
      });
      // Popular parcelas para edição
      if (editingSale.installmentsR) {
        setEditInstallmentsGlobal(editingSale.installmentsR.map((inst: any) => ({
          id: inst.id,
          amount: String(inst.amount),
          dueDate: new Date(inst.dueDate).toISOString().split('T')[0],
          paid: inst.paid,
          sequence: inst.sequence
        })));
      }
    }
  }, [editingSale]);
  
  // Função para salvar edição da venda global
  const handleSaveEditSaleGlobal = async () => {
    if (!editingSale || !token) return;
    
    setIsSavingEditGlobal(true);
    try {
      // Primeiro salvar a venda
      const res = await fetch(`/api/sales/${editingSale.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          itemName: editSaleFormGlobal.itemName,
          itemCode: editSaleFormGlobal.itemCode || null,
          totalValue: parseFloat(editSaleFormGlobal.totalValue),
          observations: editSaleFormGlobal.observations || null,
          sellerName: editSaleFormGlobal.sellerName || null,
          isExchange: editSaleFormGlobal.isExchange
        })
      });
      
      if (!res.ok) {
        const data = await res.json();
        alert(`❌ Erro: ${data.error || 'Falha ao atualizar venda'}`);
        return;
      }
      
      // Depois salvar as parcelas modificadas (somente não pagas)
      const unpaidInstallments = editInstallmentsGlobal.filter(i => !i.paid);
      for (const inst of unpaidInstallments) {
        await fetch(`/api/installments/${inst.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            amount: parseFloat(inst.amount),
            dueDate: inst.dueDate
          })
        });
      }
      
      alert('✅ Venda e parcelas atualizadas com sucesso!');
      setEditingSale(null);
      window.location.reload();
    } catch (err) {
      alert('❌ Erro ao atualizar venda');
      console.error(err);
    } finally {
      setIsSavingEditGlobal(false);
    }
  };
  
  // Função de renegociação global
  const handleRenegotiateGlobal = async () => {
    if (!editingSale || !token) return;
    
    const totalValue = parseFloat(renegotiateFormGlobal.totalValue);
    const installments = parseInt(renegotiateFormGlobal.installments);
    
    if (!totalValue || totalValue <= 0 || !installments || installments < 1 || !renegotiateFormGlobal.startDate) {
      alert('Preencha todos os campos corretamente');
      return;
    }
    
    setIsRenegotiatingGlobal(true);
    try {
      const res = await fetch(`/api/sales/${editingSale.id}/renegotiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          totalValue,
          newInstallments: installments,
          startDate: renegotiateFormGlobal.startDate
        })
      });
      
      if (!res.ok) {
        throw new Error('Erro ao renegociar');
      }
      
      alert('✅ Renegociação realizada com sucesso!');
      setShowRenegotiateGlobal(false);
      setRenegotiateFormGlobal({ totalValue: '', installments: '1', startDate: '' });
      setEditingSale(null);
      window.location.reload();
    } catch (error) {
      console.error('Erro ao renegociar:', error);
      alert('❌ Erro ao renegociar venda');
    } finally {
      setIsRenegotiatingGlobal(false);
    }
  };

  const loadClients = async () => {
    const res = await fetch('/api/clients', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (Array.isArray(data)) {
      setClients(data);
      setFilteredClients(data);
    }
  };

  const computeForecast = (pending: any[], year: number) => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    
    // Calcular para o ano atual
    const forecast: { [key: string]: { value: number; installments: any[] } } = {};
    for (let i = 0; i < 12; i++) {
      forecast[`${year}-${i}`] = { value: 0, installments: [] };
    }

    pending.forEach((inst: any) => {
      const dueDate = new Date(inst.dueDate);
      const y = dueDate.getFullYear();
      const m = dueDate.getMonth();
      if (y === year && !inst.paid) {
        forecast[`${y}-${m}`].value += inst.amount || 0;
        forecast[`${y}-${m}`].installments.push(inst);
      }
    });

    let accumulated = 0;
    const forecastArray = [];
    for (let i = 0; i < 12; i++) {
      const monthData = forecast[`${year}-${i}`];
      accumulated += monthData.value;
      forecastArray.push({
        month: months[i],
        value: monthData.value,
        accumulated,
        installments: monthData.installments
      });
    }
    setForecastData(forecastArray);
    
    // Calcular para o próximo ano
    const forecastNext: { [key: string]: { value: number; installments: any[] } } = {};
    const nextYear = year + 1;
    for (let i = 0; i < 12; i++) {
      forecastNext[`${nextYear}-${i}`] = { value: 0, installments: [] };
    }

    pending.forEach((inst: any) => {
      const dueDate = new Date(inst.dueDate);
      const y = dueDate.getFullYear();
      const m = dueDate.getMonth();
      if (y === nextYear && !inst.paid) {
        forecastNext[`${y}-${m}`].value += inst.amount || 0;
        forecastNext[`${y}-${m}`].installments.push(inst);
      }
    });

    let accumulatedNext = 0;
    const forecastArrayNext = [];
    for (let i = 0; i < 12; i++) {
      const monthData = forecastNext[`${nextYear}-${i}`];
      accumulatedNext += monthData.value;
      forecastArrayNext.push({
        month: months[i],
        value: monthData.value,
        accumulated: accumulatedNext,
        installments: monthData.installments
      });
    }
    setForecastDataNextYear(forecastArrayNext);
  };

  const loadDashboard = async () => {
    const headers = { Authorization: `Bearer ${token}` };
    const [statsRes, salesRes, installmentsRes, revenueRes, allInstallmentsRes] = await Promise.all([
      fetch('/api/dashboard/stats', { headers }),
      fetch('/api/dashboard/recent-sales', { headers }),
      fetch('/api/dashboard/pending-installments', { headers }),
      fetch('/api/dashboard/monthly-revenue', { headers }),
      fetch('/api/installments/pending', { headers })
    ]);
    setStats(await statsRes.json());
    setRecentSales(await salesRes.json());
    setPendingInstallments(await installmentsRes.json());
    const monthlyRevenueResp = await revenueRes.json();
    if (Array.isArray(monthlyRevenueResp)) {
      const cy = new Date().getFullYear();
      setMonthlyRevenueByYear({ [cy]: monthlyRevenueResp });
      setMonthlyRevenueYears([cy]);
      setMonthlyRevenueYear(cy);
      setMonthlyRevenue(monthlyRevenueResp);
    } else if (monthlyRevenueResp && typeof monthlyRevenueResp === 'object') {
      const entries = Object.entries(monthlyRevenueResp) as [string, number[]][];
      const years = entries.map(([y]) => Number(y)).sort((a, b) => a - b);
      setMonthlyRevenueByYear(entries.reduce((acc, [y, arr]) => ({ ...acc, [Number(y)]: arr }), {}));
      setMonthlyRevenueYears(years);
      const cy = new Date().getFullYear();
      const target = years.includes(monthlyRevenueYear) ? monthlyRevenueYear : (years.includes(cy) ? cy : years[years.length - 1]);
      setMonthlyRevenueYear(target);
      setMonthlyRevenue(monthlyRevenueResp[target] || Array(12).fill(0));
    } else {
      setMonthlyRevenue(Array(12).fill(0));
    }
    
    // Calcular previsão de recebimentos
    const allPending = await allInstallmentsRes.json();
    if (Array.isArray(allPending)) {
      setPendingInstallmentsAll(allPending);
      const yearsSet = new Set<number>();
      allPending.forEach((inst: any) => {
        const y = new Date(inst.dueDate).getFullYear();
        yearsSet.add(y);
      });
      const sortedYears = Array.from(yearsSet).sort((a, b) => a - b);
      setForecastYears(sortedYears);

      const currentYear = new Date().getFullYear();
      const targetYear = yearsSet.has(forecastYear)
        ? forecastYear
        : (sortedYears.includes(currentYear) ? currentYear : (sortedYears[sortedYears.length - 1] || currentYear));
      setForecastYear(targetYear);
      computeForecast(allPending, targetYear);
    }
  };

  // Recalcular previsão ao trocar o ano
  useEffect(() => {
    if (pendingInstallmentsAll.length > 0) {
      computeForecast(pendingInstallmentsAll, forecastYear);
    }
  }, [forecastYear, pendingInstallmentsAll]);

  // Recalcular receita mensal ao trocar o ano
  useEffect(() => {
    if (monthlyRevenueByYear[monthlyRevenueYear]) {
      setMonthlyRevenue(monthlyRevenueByYear[monthlyRevenueYear]);
    }
  }, [monthlyRevenueYear, monthlyRevenueByYear]);

  const openStatsModal = async (type: string) => {
    setStatsModal(type);
    const headers = { Authorization: `Bearer ${token}` };
    
    if (type === 'vendas' || type === 'receita' || type === 'saldo') {
      const res = await fetch('/api/sales', { headers });
      const data = await res.json();
      setAllSales(Array.isArray(data) ? data : []);
    }
    
    if (type === 'despesas' || type === 'saldo') {
      const res = await fetch('/api/expenses', { headers });
      const data = await res.json();
      setAllExpenses(Array.isArray(data) ? data : []);
    }
  };

  const openClientModal = async (clientId: number) => {
    const client = clients.find(c => c.id === clientId);
    if (client) {
      setSelectedClientForModal(client);
    } else {
      // Buscar cliente se não estiver na lista
      const clientRes = await fetch(`/api/clients`, { headers: { Authorization: `Bearer ${token}` }});
      const allClients = await clientRes.json();
      const foundClient = allClients.find((c: any) => c.id === clientId);
      if (foundClient) setSelectedClientForModal(foundClient);
    }
    
    // Buscar vendas do cliente
    const salesRes = await fetch(`/api/clients/${clientId}/sales`, { headers: { Authorization: `Bearer ${token}` }});
    const sales = await salesRes.json();
    setClientSalesForModal(sales);
  };

  const closeClientModal = () => {
    setSelectedClientForModal(null);
    setClientSalesForModal([]);
  };

  const handleLogin = async () => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (data.token) {
      setToken(data.token);
      setLoggedEmail(email);
      localStorage.setItem('token', data.token);
      localStorage.setItem('loggedEmail', email);
      setPage('dashboard');
    } else {
      alert('Erro ao fazer login');
    }
  };

  const markAsPaid = async (id: number, paidAt?: string) => {
    const res = await fetch(`/api/installments/${id}/pay`, {
      method: 'POST',
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ paidAt })
    });
    const paidInstallment = await res.json();
    setPaymentModalInstallment(null);
    loadDashboard();
    
    // Recarregar dados do modal se estiver aberto
    if (selectedClientForModal) {
      const salesRes = await fetch(`/api/clients/${selectedClientForModal.id}/sales`, { headers: { Authorization: `Bearer ${token}` }});
      const sales = await salesRes.json();
      setClientSalesForModal(sales);
    }
    
    // Abrir modal de compartilhamento do carnê atualizado
    if (paidInstallment.sale) {
      setShareModalData({
        sale: paidInstallment.sale,
        client: paidInstallment.sale.client,
        message: `Parcela ${paidInstallment.sequence} paga com sucesso! Deseja enviar o carnê atualizado?`
      });
    }
  };

  // Editar valor de parcela
  const handleEditInstallment = async (installmentId: number, newAmount: number) => {
    await fetch(`/api/installments/${installmentId}`, {
      method: 'PUT',
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ amount: newAmount })
    });
    loadDashboard();
  };

  // Editar cliente
  const handleUpdateClient = async (clientId: number, data: any) => {
    await fetch(`/api/clients/${clientId}`, {
      method: 'PUT',
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    loadClients();
    if (selectedClientForModal?.id === clientId) {
      setSelectedClientForModal({ ...selectedClientForModal, ...data });
    }
  };

  const handleClientSearch = (e: any) => {
    const raw = e.target.value;
    const search = raw.toLowerCase().normalize('NFD').replaceAll(/\p{Diacritic}/gu, '');
    const phoneSearch = raw.replaceAll(/\D/g, '');
    setClientSearch(raw);
    setFilteredClients(
      clients.filter(c => 
        (search && (
          c.name.toLowerCase().normalize('NFD').replaceAll(/\p{Diacritic}/gu, '').startsWith(search) ||
          c.name.toLowerCase().normalize('NFD').replaceAll(/\p{Diacritic}/gu, '').includes(search)
        )) ||
        (phoneSearch && (
          c.phone.startsWith(phoneSearch) || c.phone.includes(phoneSearch)
        ))
      )
    );
  };

  const handleImportClients = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/clients/import', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (data.imported !== undefined) {
        if (data.imported === 0) {
          alert('✓ Importação concluída!\n\nNenhum contato novo foi adicionado.\nTodos os números já existem no sistema.');
        } else {
          alert(`✓ Importação concluída com sucesso!\n\n${data.imported} novo(s) contato(s) adicionado(s).\n\nContatos duplicados (telefones já existentes) foram ignorados automaticamente.`);
        }
        loadClients();
      }
    } catch (error) {
      alert('Erro ao importar contatos');
    }
    // Limpar input para permitir reimportar mesmo arquivo
    e.target.value = '';
  };

  const handleDeleteAllClients = async () => {
    const confirmation = prompt('⚠️ ATENÇÃO!\n\nVocê tem certeza que deseja APAGAR TODOS OS CLIENTES?\n\nEsta ação NÃO pode ser desfeita!\n\nDigite "CONFIRMAR" para continuar:');
    if (confirmation !== 'CONFIRMAR') {
      alert('Operação cancelada.');
      return;
    }

    const secondConfirm = confirm(`Confirmando pela última vez:\n\nTodos os ${clients.length} clientes serão PERMANENTEMENTE DELETADOS.\n\nProsseguir?`);
    if (!secondConfirm) {
      alert('Operação cancelada.');
      return;
    }

    try {
      const res = await fetch('/api/clients/delete-all', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        alert(`✓ ${data.deleted} cliente(s) foram deletados com sucesso!`);
        loadClients();
      } else {
        alert('Erro ao deletar clientes');
      }
    } catch (error) {
      alert('Erro ao deletar clientes: ' + error);
    }
  };

  const handleCreateClient = async () => {
    if (!newClientName || !newClientPhone) {
      alert('Preencha pelo menos o nome e telefone do cliente');
      return;
    }

    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: newClientName,
          phone: newClientPhone,
          cpf: newClientCpf || null,
          rg: newClientRg || null,
          city: newClientCity || null,
          address: newClientAddress || null,
          billingAddress: newClientBillingAddress || null,
          profession: newClientProfession || null,
          workPhone: newClientWorkPhone || null,
          workAddress: newClientWorkAddress || null
        })
      });

      if (res.ok) {
        alert('✅ Cliente criado com sucesso!');
        setShowCreateClientModal(false);
        setNewClientName('');
        setNewClientPhone('');
        setNewClientCpf('');
        setNewClientRg('');
        setNewClientCity('');
        setNewClientAddress('');
        setNewClientBillingAddress('');
        setNewClientProfession('');
        setNewClientWorkPhone('');
        setNewClientWorkAddress('');
        loadClients();
      } else {
        alert('Erro ao criar cliente');
      }
    } catch (error) {
      alert('Erro ao criar cliente: ' + error);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-blue-500">
        <div className="bg-white p-8 rounded-xl shadow-2xl w-96">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">💎 Joias Vendas</h1>
          <input
            type="email"
            placeholder="E-mail"
            className="w-full p-3 border rounded-lg mb-3"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Senha"
            className="w-full p-3 border rounded-lg mb-4"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button onClick={handleLogin} className="w-full bg-purple-600 text-white p-3 rounded-lg font-semibold hover:bg-purple-700">
            Entrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ScrollToTop />
      <nav className="bg-purple-600 text-white p-4 shadow-lg">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">💎 Joias Vendas</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm bg-white/20 px-3 py-1 rounded-full">👤 {loggedEmail}</span>
          </div>
        </div>
        <div className="flex gap-3 mt-3 flex-wrap">
          <button 
            onClick={() => setPage('dashboard')} 
            className={`px-4 py-2 rounded ${page === 'dashboard' ? 'bg-white text-purple-600' : 'bg-purple-500'}`}>
            📊 Dashboard
          </button>
          <button 
            onClick={() => setPage('vendas')} 
            className={`px-4 py-2 rounded ${page === 'vendas' ? 'bg-white text-purple-600' : 'bg-purple-500'}`}>
            ➕ Nova Venda
          </button>
          <button 
            onClick={() => setPage('despesas')} 
            className={`px-4 py-2 rounded ${page === 'despesas' ? 'bg-white text-purple-600' : 'bg-purple-500'}`}>
            💰 Despesas
          </button>
          <button 
            onClick={() => setPage('clientes')} 
            className={`px-4 py-2 rounded ${page === 'clientes' ? 'bg-white text-purple-600' : 'bg-purple-500'}`}>
            👥 Clientes
          </button>
          <button 
            onClick={() => setPage('historico')} 
            className={`px-4 py-2 rounded ${page === 'historico' ? 'bg-white text-purple-600' : 'bg-purple-500'}`}>
            📜 Histórico
          </button>
          <button 
            onClick={() => setPage('relatorio')} 
            className={`px-4 py-2 rounded ${page === 'relatorio' ? 'bg-white text-purple-600' : 'bg-purple-500'}`}>
            📊 Fechamento
          </button>
          <button 
            onClick={() => setPage('cobranca')} 
            className={`px-4 py-2 rounded ${page === 'cobranca' ? 'bg-white text-purple-600' : 'bg-purple-500'}`}>
            🧾 Relação de Cobrança
          </button>
          <button 
            onClick={() => setPage('mostruario')} 
            className={`px-4 py-2 rounded ${page === 'mostruario' ? 'bg-white text-purple-600' : 'bg-purple-500'}`}>
            💎 Mostruário
          </button>
          <button 
            onClick={() => setPage('config')} 
            className={`px-4 py-2 rounded ${page === 'config' ? 'bg-white text-purple-600' : 'bg-purple-500'}`}>
            ⚙️ Configurações
          </button>
          <button 
            onClick={() => { setToken(''); setLoggedEmail(''); localStorage.removeItem('token'); localStorage.removeItem('loggedEmail'); }} 
            className="px-4 py-2 bg-red-500 rounded hover:bg-red-600">
            🚪 Sair
          </button>
        </div>
      </nav>

      {/* Modal de Compartilhamento após Pagamento */}
      {shareModalData && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          role="button"
          tabIndex={0}
          aria-label="Fechar confirmação de pagamento"
          onClick={() => setShareModalData(null)}
          onKeyDown={(e) => {
            if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setShareModalData(null);
            }
          }}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">✅ Pagamento Registrado!</h3>
              <button onClick={() => setShareModalData(null)} className="text-gray-500 hover:text-gray-700">✖</button>
            </div>
            <p className="text-gray-600 mb-4">{shareModalData.message || 'Deseja enviar o carnê atualizado?'}</p>
            <ShareCarneModal 
              sale={shareModalData.sale} 
              client={shareModalData.client} 
              onClose={() => setShareModalData(null)} 
            />
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto p-6">
        {page === 'dashboard' && (
          <div>
            {/* Cards de Estatísticas */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div 
                  onClick={() => openStatsModal('vendas')}
                  className="bg-white rounded-xl shadow-lg p-6 cursor-pointer hover:shadow-xl hover:scale-105 transition-all">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm">Total de Vendas</p>
                      <p className="text-3xl font-bold text-purple-600">{stats.totalSales}</p>
                    </div>
                    <div className="text-4xl">🛍️</div>
                  </div>
                </div>

                <div 
                  onClick={() => openStatsModal('receita')}
                  className="bg-white rounded-xl shadow-lg p-6 cursor-pointer hover:shadow-xl hover:scale-105 transition-all">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm">Receita Total</p>
                      <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalRevenue)}</p>
                    </div>
                    <div className="text-4xl">💵</div>
                  </div>
                </div>

                <div 
                  onClick={() => openStatsModal('despesas')}
                  className="bg-white rounded-xl shadow-lg p-6 cursor-pointer hover:shadow-xl hover:scale-105 transition-all">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm">Despesas</p>
                      <p className="text-2xl font-bold text-red-600">{formatCurrency(stats.totalExpenses)}</p>
                    </div>
                    <div className="text-4xl">💸</div>
                  </div>
                </div>

                <div 
                  onClick={() => openStatsModal('saldo')}
                  className="bg-white rounded-xl shadow-lg p-6 cursor-pointer hover:shadow-xl hover:scale-105 transition-all">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm">Saldo</p>
                      <p className="text-2xl font-bold text-blue-600">{formatCurrency(stats.balance)}</p>
                    </div>
                    <div className="text-4xl">💰</div>
                  </div>
                </div>
              </div>
            )}

            {/* Gráfico de Receita Mensal */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h2 className="text-xl font-bold text-gray-800">📈 Receita Mensal ({monthlyRevenueYear})</h2>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600" htmlFor="monthlyRevenueYear">Ano:</label>
                  <select
                    id="monthlyRevenueYear"
                    value={monthlyRevenueYear}
                    onChange={(e) => setMonthlyRevenueYear(Number(e.target.value))}
                    className="border-2 border-gray-200 rounded-lg px-3 py-1 text-sm focus:border-purple-600 focus:outline-none"
                  >
                    {(monthlyRevenueYears.length > 0 ? monthlyRevenueYears : [new Date().getFullYear()]).map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-end justify-between h-64 gap-2">
                {monthlyRevenue.map((value, index) => {
                  const maxValue = Math.max(...monthlyRevenue, 1);
                  const height = (value / maxValue) * 100;
                  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
                  
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center">
                      <div className="w-full bg-gradient-to-t from-purple-600 to-blue-500 rounded-t" 
                           style={{ height: `${height}%`, minHeight: value > 0 ? '20px' : '0' }}>
                      </div>
                      <p className="text-xs text-gray-600 mt-2">{months[index]}</p>
                      <p className="text-xs text-gray-400">{value > 0 ? formatCurrency(value) : '-'}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Previsão de Recebimentos */}
            {forecastData.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <h2 className="text-xl font-bold text-gray-800">📅 Previsão de Recebimentos ({forecastYear} e {forecastYear + 1})</h2>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600" htmlFor="forecastYear">Ano:</label>
                    <select
                      id="forecastYear"
                      value={forecastYear}
                      onChange={(e) => setForecastYear(Number(e.target.value))}
                      className="border-2 border-gray-200 rounded-lg px-3 py-1 text-sm focus:border-purple-600 focus:outline-none"
                    >
                      {(forecastYears.length > 0 ? forecastYears : [new Date().getFullYear()]).map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-4">Parcelas pendentes a receber em cada mês - Ano atual vs Próximo ano</p>
                
                {/* Grid de duas tabelas lado a lado */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Tabela Ano Atual */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-3 text-center">{forecastYear}</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="text-left p-2 rounded-tl-lg">Mês</th>
                            <th className="text-center p-2">Parcelas</th>
                            <th className="text-right p-2">A Receber</th>
                            <th className="text-right p-2 rounded-tr-lg">Acumulado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {forecastData.map((item, index) => {
                            const isCurrentMonth = index === new Date().getMonth() && forecastYear === new Date().getFullYear();
                            const isPast = index < new Date().getMonth() && forecastYear === new Date().getFullYear();
                            const expanded = expandedMonths.includes(index);
                            const toggleExpand = () => {
                              if (expanded) {
                                setExpandedMonths(expandedMonths.filter(m => m !== index));
                              } else {
                                setExpandedMonths([...expandedMonths, index]);
                              }
                            };
                            return (
                              <Fragment key={`current-${item.month}`}>
                                <tr 
                                  className={`border-b cursor-pointer hover:bg-gray-50 ${isCurrentMonth ? 'bg-blue-50 font-semibold' : isPast ? 'text-gray-400' : ''}`}
                                  onClick={() => item.installments && item.installments.length > 0 && toggleExpand()}
                                >
                                  <td className="p-2">
                                    {item.installments && item.installments.length > 0 && (
                                      <span className="mr-2">{expanded ? '▼' : '▶'}</span>
                                    )}
                                    {isCurrentMonth && '👉 '}{item.month}
                                    {isCurrentMonth && <span className="text-xs ml-1 text-blue-600">(atual)</span>}
                                  </td>
                                  <td className="text-center p-2">
                                    {item.installments?.length || 0}
                                  </td>
                                  <td className={`text-right p-2 ${item.value > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                                    {item.value > 0 ? formatCurrency(item.value) : '-'}
                                  </td>
                                  <td className="text-right p-2 text-blue-600 font-medium">
                                    {formatCurrency(item.accumulated)}
                                  </td>
                                </tr>
                                {expanded && item.installments && item.installments.map((inst: any) => (
                                  <tr key={inst.id} className="bg-gray-50 text-xs">
                                    <td className="p-2 pl-8" colSpan={2}>
                                      <span className="font-medium">{inst.sale?.client?.name || 'Cliente'}</span>
                                      <span className="text-gray-500 ml-2">- {inst.sale?.itemName}</span>
                                      <span className="text-gray-400 ml-2">(Parcela {inst.sequence})</span>
                                    </td>
                                    <td className="p-2 text-right">
                                      {editingInstallment?.id === inst.id ? (
                                        <input 
                                          type="number" 
                                          step="0.01"
                                          className="w-20 p-1 border rounded text-right"
                                          defaultValue={inst.amount}
                                          aria-label={`Editar valor da parcela ${inst.sequence}`}
                                          title="Editar valor da parcela"
                                          onBlur={(e) => {
                                            handleEditInstallment(inst.id, parseFloat(e.target.value));
                                            setEditingInstallment(null);
                                          }}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                              handleEditInstallment(inst.id, parseFloat((e.target as HTMLInputElement).value));
                                              setEditingInstallment(null);
                                            }
                                            if (e.key === 'Escape') setEditingInstallment(null);
                                          }}
                                          autoFocus
                                        />
                                      ) : (
                                        <span 
                                          className="text-green-600 cursor-pointer hover:bg-green-100 px-2 py-1 rounded"
                                          onClick={(e) => { e.stopPropagation(); setEditingInstallment(inst); }}
                                          title="Clique para editar"
                                        >
                                          {formatCurrency(inst.amount)} ✏️
                                        </span>
                                      )}
                                    </td>
                                    <td className="p-2 text-right text-gray-400">
                                      {new Date(inst.dueDate).toLocaleDateString('pt-BR')}
                                    </td>
                                  </tr>
                                ))}
                              </Fragment>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="bg-gradient-to-r from-green-100 to-blue-100 font-bold">
                            <td className="p-3 rounded-bl-lg" colSpan={2}>🎯 Total</td>
                            <td className="text-right p-3 text-green-700">
                              {formatCurrency(forecastData.reduce((acc, item) => acc + item.value, 0))}
                            </td>
                            <td className="text-right p-3 text-blue-700 rounded-br-lg">
                              {formatCurrency(forecastData[11]?.accumulated || 0)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                  
                  {/* Tabela Próximo Ano */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-3 text-center">{forecastYear + 1}</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="text-left p-2 rounded-tl-lg">Mês</th>
                            <th className="text-center p-2">Parcelas</th>
                            <th className="text-right p-2">A Receber</th>
                            <th className="text-right p-2 rounded-tr-lg">Acumulado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {forecastDataNextYear.map((item, index) => {
                            const expanded = expandedMonths.includes(index + 100);
                            const toggleExpand = () => {
                              if (expanded) {
                                setExpandedMonths(expandedMonths.filter(m => m !== index + 100));
                              } else {
                                setExpandedMonths([...expandedMonths, index + 100]);
                              }
                            };
                            return (
                              <Fragment key={`next-${item.month}`}>
                                <tr 
                                  className="border-b cursor-pointer hover:bg-gray-50"
                                  onClick={() => item.installments && item.installments.length > 0 && toggleExpand()}
                                >
                                  <td className="p-2">
                                    {item.installments && item.installments.length > 0 && (
                                      <span className="mr-2">{expanded ? '▼' : '▶'}</span>
                                    )}
                                    {item.month}
                                  </td>
                                  <td className="text-center p-2">
                                    {item.installments?.length || 0}
                                  </td>
                                  <td className={`text-right p-2 ${item.value > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                                    {item.value > 0 ? formatCurrency(item.value) : '-'}
                                  </td>
                                  <td className="text-right p-2 text-blue-600 font-medium">
                                    {formatCurrency(item.accumulated)}
                                  </td>
                                </tr>
                                {expanded && item.installments && item.installments.map((inst: any) => (
                                  <tr key={inst.id} className="bg-gray-50 text-xs">
                                    <td className="p-2 pl-8" colSpan={2}>
                                      <span className="font-medium">{inst.sale?.client?.name || 'Cliente'}</span>
                                      <span className="text-gray-500 ml-2">- {inst.sale?.itemName}</span>
                                      <span className="text-gray-400 ml-2">(Parcela {inst.sequence})</span>
                                    </td>
                                    <td className="p-2 text-right">
                                      {editingInstallment?.id === inst.id ? (
                                        <input 
                                          type="number" 
                                          step="0.01"
                                          className="w-20 p-1 border rounded text-right"
                                          defaultValue={inst.amount}
                                          aria-label={`Editar valor da parcela ${inst.sequence}`}
                                          title="Editar valor da parcela"
                                          onBlur={(e) => {
                                            handleEditInstallment(inst.id, parseFloat(e.target.value));
                                            setEditingInstallment(null);
                                          }}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                              handleEditInstallment(inst.id, parseFloat((e.target as HTMLInputElement).value));
                                              setEditingInstallment(null);
                                            }
                                            if (e.key === 'Escape') setEditingInstallment(null);
                                          }}
                                          autoFocus
                                        />
                                      ) : (
                                        <span 
                                          className="text-green-600 cursor-pointer hover:bg-green-100 px-2 py-1 rounded"
                                          onClick={(e) => { e.stopPropagation(); setEditingInstallment(inst); }}
                                          title="Clique para editar"
                                        >
                                          {formatCurrency(inst.amount)} ✏️
                                        </span>
                                      )}
                                    </td>
                                    <td className="p-2 text-right text-gray-400">
                                      {new Date(inst.dueDate).toLocaleDateString('pt-BR')}
                                    </td>
                                  </tr>
                                ))}
                              </Fragment>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="bg-gradient-to-r from-green-100 to-blue-100 font-bold">
                            <td className="p-3 rounded-bl-lg" colSpan={2}>🎯 Total</td>
                            <td className="text-right p-3 text-green-700">
                              {formatCurrency(forecastDataNextYear.reduce((acc, item) => acc + item.value, 0))}
                            </td>
                            <td className="text-right p-3 text-blue-700 rounded-br-lg">
                              {formatCurrency(forecastDataNextYear[11]?.accumulated || 0)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Vendas Recentes */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">🛍️ Vendas Recentes</h2>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {recentSales.map((sale: any) => (
                    <div 
                      key={sale.id} 
                      className={`border-l-4 pl-4 py-2 rounded hover:opacity-80 transition ${sale.isExchange ? 'border-orange-500 bg-orange-50' : 'border-purple-600 bg-gray-50 hover:bg-purple-50'}`}
                    >
                      <div className="flex justify-between items-start">
                        <div 
                          className="flex-1 cursor-pointer"
                          onClick={() => sale.client?.id && openClientModal(sale.client.id)}
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-gray-800">{sale.itemName}</p>
                            {sale.isExchange && (
                              <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                🔄 TROCA
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 hover:text-purple-600">{sale.client?.name || 'Cliente não encontrado'}</p>
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-green-600 font-bold">{formatCurrency(sale.totalValue)}</span>
                            <span className="text-xs text-gray-500">{formatDate(sale.saleDate)}</span>
                          </div>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditingSale(sale); }}
                          className="p-2 text-yellow-600 hover:bg-yellow-100 rounded transition ml-2"
                          title="Editar venda"
                        >
                          ✏️
                        </button>
                      </div>
                    </div>
                  ))}
                  {recentSales.length === 0 && (
                    <p className="text-gray-400 text-center py-8">Nenhuma venda registrada ainda</p>
                  )}
                </div>
              </div>

              {/* Parcelas a Vencer */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">⏰ Parcelas a Vencer (30 dias)</h2>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {pendingInstallments.map((inst: any) => {
                    const daysUntilDue = Math.ceil((new Date(inst.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                    const isOverdue = daysUntilDue < 0;
                    const isDueSoon = daysUntilDue >= 0 && daysUntilDue <= 3;
                    
                    return (
                      <div 
                        key={inst.id} 
                        className={`border-l-4 pl-4 py-2 rounded hover:opacity-80 transition ${
                          isOverdue ? 'border-red-600 bg-red-50' : 
                          isDueSoon ? 'border-yellow-600 bg-yellow-50' : 
                          'border-blue-600 bg-blue-50'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div 
                            className="flex-1 cursor-pointer"
                            onClick={() => inst.sale.client?.id && openClientModal(inst.sale.client.id)}
                          >
                            <p className="font-semibold text-gray-800 hover:text-purple-600">
                              {inst.sale.client?.name || 'Cliente não encontrado'} - Parcela {inst.sequence}/{inst.sale.installments}
                            </p>
                            <p className="text-sm text-gray-600">{inst.sale.itemName}</p>
                            <div className="flex justify-between items-center mt-2">
                              <span className="font-bold text-gray-800">{formatCurrency(inst.amount)}</span>
                              <span className={`text-xs ${isOverdue ? 'text-red-600' : isDueSoon ? 'text-yellow-600' : 'text-blue-600'}`}>
                                {isOverdue ? `Atrasado ${Math.abs(daysUntilDue)} dias` :
                                 isDueSoon ? `Vence em ${daysUntilDue} dias` :
                                 formatDate(inst.dueDate)}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditingSale(inst.sale); }}
                            className="p-2 text-yellow-600 hover:bg-yellow-100 rounded transition ml-2"
                            title="Editar venda"
                          >
                            ✏️
                          </button>
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setPaymentModalInstallment(inst); }}
                          className="mt-2 w-full bg-green-500 text-white text-sm py-1 rounded hover:bg-green-600">
                          ✓ Marcar como Pago
                        </button>
                      </div>
                    );
                  })}
                  {pendingInstallments.length === 0 && (
                    <p className="text-gray-400 text-center py-8">Nenhuma parcela pendente</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {page === 'vendas' && <NovaVendaPage token={token} onSuccess={() => setPage('dashboard')} clients={clients} />}
        {page === 'despesas' && <DespesasPage token={token} />}
        {page === 'clientes' && <ClientesPage token={token} clients={filteredClients} clientSearch={clientSearch} handleClientSearch={handleClientSearch} handleImportClients={handleImportClients} openClientModal={openClientModal} handleDeleteAllClients={handleDeleteAllClients} onCreateClient={() => setShowCreateClientModal(true)} />}
        {page === 'historico' && <HistoricoPage token={token} openClientModal={openClientModal} />}
        {page === 'cobranca' && <CobrancaPage token={token} />}
        {page === 'mostruario' && <MostruarioPage token={token} />}
        {page === 'relatorio' && <RelatorioPage token={token} clients={clients} />}
        {page === 'config' && <ConfigPage token={token} />}
      </div>

      {/* Modal do Carnê */}
      {selectedClientForModal && (
        <CarneModal 
          client={selectedClientForModal} 
          sales={clientSalesForModal} 
          onClose={closeClientModal}
          token={token}
          onUpdateClient={handleUpdateClient}
          onMarkPaid={(inst) => {
            setPaymentModalInstallment({
              ...inst,
              sale: {
                itemName: clientSalesForModal.find(s => s.id === inst.saleId)?.itemName || 'Item',
                client: selectedClientForModal
              }
            });
          }}
        />
      )}

      {/* Modal de Pagamento */}
      {paymentModalInstallment && (
        <PaymentModal
          installment={paymentModalInstallment}
          onConfirm={markAsPaid}
          onClose={() => setPaymentModalInstallment(null)}
        />
      )}

      {/* Modal de Estatísticas */}
      {statsModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          role="button"
          tabIndex={0}
          aria-label="Fechar modal de estatísticas"
          onClick={() => setStatsModal(null)}
          onKeyDown={(e) => {
            if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setStatsModal(null);
            }
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">
                  {statsModal === 'vendas' && '🛍️ Todas as Vendas'}
                  {statsModal === 'receita' && '💵 Detalhes da Receita'}
                  {statsModal === 'despesas' && '💸 Todas as Despesas'}
                  {statsModal === 'saldo' && '💰 Resumo Financeiro'}
                </h2>
                <button 
                  onClick={() => setStatsModal(null)} 
                  className="text-3xl hover:bg-white/20 rounded-full w-10 h-10 flex items-center justify-center"
                >
                  ×
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {/* Vendas */}
              {statsModal === 'vendas' && (
                <div>
                  <p className="text-gray-600 mb-4">Total de {allSales.length} venda(s) registrada(s)</p>
                  <div className="space-y-3">
                    {allSales.map((sale: any) => (
                      <div key={sale.id} className={`p-4 rounded-lg border ${sale.isExchange ? 'bg-orange-50 border-orange-300' : 'bg-gray-50'}`}>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-purple-700">{sale.itemName}</p>
                              {sale.isExchange && (
                                <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                  🔄 TROCA
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">👤 {sale.client?.name || 'Cliente não identificado'}</p>
                            <p className="text-sm text-gray-500">📅 {new Date(sale.date).toLocaleDateString('pt-BR')}</p>
                          </div>
                          <div className="text-right flex items-start gap-2">
                            <div>
                              <p className="font-bold text-green-600">{formatCurrency(sale.totalValue)}</p>
                              <p className="text-xs text-gray-500">{sale.installments?.length || 0} parcela(s)</p>
                            </div>
                            <button
                              onClick={() => setEditingSale(sale)}
                              className="p-2 text-yellow-600 hover:bg-yellow-100 rounded transition"
                              title="Editar venda"
                            >
                              ✏️
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {allSales.length === 0 && (
                      <p className="text-center text-gray-500 py-8">Nenhuma venda registrada</p>
                    )}
                  </div>
                </div>
              )}

              {/* Receita */}
              {statsModal === 'receita' && (
                <div>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-green-50 p-4 rounded-lg text-center">
                      <p className="text-sm text-gray-600">Total em Vendas</p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(allSales.reduce((acc: number, s: any) => acc + (s.totalValue || 0), 0))}
                      </p>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-lg text-center">
                      <p className="text-sm text-gray-600">Parcelas Pagas</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {formatCurrency(allSales.reduce((acc: number, s: any) => 
                          acc + (s.installmentsR?.filter((i: any) => i.paid).reduce((a: number, i: any) => a + (i.amount || 0), 0) || 0), 0))}
                      </p>
                    </div>
                  </div>
                  <h3 className="font-semibold text-gray-700 mb-3">📊 Por Cliente</h3>
                  <div className="space-y-2">
                    {Object.entries(allSales.reduce((acc: any, s: any) => {
                      const name = s.client?.name || 'Sem cliente';
                      acc[name] = (acc[name] || 0) + (s.totalValue || 0);
                      return acc;
                    }, {})).sort((a: any, b: any) => b[1] - a[1]).map(([name, value]: any) => (
                      <div key={name} className="flex justify-between items-center bg-gray-50 p-3 rounded">
                        <span className="text-gray-700">👤 {name}</span>
                        <span className="font-semibold text-green-600">{formatCurrency(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Despesas */}
              {statsModal === 'despesas' && (
                <div>
                  <p className="text-gray-600 mb-4">Total de {allExpenses.length} despesa(s)</p>
                  <div className="space-y-3">
                    {allExpenses.map((exp: any) => (
                      <div key={exp.id} className="bg-red-50 p-4 rounded-lg border border-red-100">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold text-red-700">{exp.description}</p>
                            <p className="text-sm text-gray-500">📅 {new Date(exp.date).toLocaleDateString('pt-BR')}</p>
                          </div>
                          <p className="font-bold text-red-600">{formatCurrency(exp.value)}</p>
                        </div>
                      </div>
                    ))}
                    {allExpenses.length === 0 && (
                      <p className="text-center text-gray-500 py-8">Nenhuma despesa registrada</p>
                    )}
                  </div>
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-700">Total de Despesas:</span>
                      <span className="text-xl font-bold text-red-600">
                        {formatCurrency(allExpenses.reduce((acc: number, e: any) => acc + (e.value || 0), 0))}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Saldo */}
              {statsModal === 'saldo' && (
                <div>
                  <div className="space-y-4">
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-green-700">💵 Receita Total (Vendas)</span>
                        <span className="text-xl font-bold text-green-600">
                          {formatCurrency(allSales.reduce((acc: number, s: any) => acc + (s.totalValue || 0), 0))}
                        </span>
                      </div>
                    </div>
                    <div className="bg-red-50 p-4 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-red-700">💸 Despesas Total</span>
                        <span className="text-xl font-bold text-red-600">
                          {formatCurrency(allExpenses.reduce((acc: number, e: any) => acc + (e.value || 0), 0))}
                        </span>
                      </div>
                    </div>
                    <div className="bg-blue-100 p-4 rounded-lg border-2 border-blue-300">
                      <div className="flex justify-between items-center">
                        <span className="text-blue-800 font-semibold">💰 Saldo Final</span>
                        <span className="text-2xl font-bold text-blue-600">
                          {formatCurrency(
                            allSales.reduce((acc: number, s: any) => acc + (s.totalValue || 0), 0) -
                            allExpenses.reduce((acc: number, e: any) => acc + (e.value || 0), 0)
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t">
                    <h3 className="font-semibold text-gray-700 mb-3">📈 Resumo</h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-gray-50 p-3 rounded">
                        <p className="text-gray-600">Total de Vendas</p>
                        <p className="font-bold text-purple-600">{allSales.length}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded">
                        <p className="text-gray-600">Total de Despesas</p>
                        <p className="font-bold text-red-600">{allExpenses.length}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-gray-100 p-4">
              <button 
                onClick={() => setStatsModal(null)}
                className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Criar Cliente */}
      {showCreateClientModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-800 mb-4">➕ Criar Novo Cliente</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Nome *</label>
                <input
                  type="text"
                  placeholder="Nome do cliente"
                  className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Telefone/WhatsApp *</label>
                <input
                  type="tel"
                  placeholder="(11) 99999-9999"
                  className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                  value={newClientPhone}
                  onChange={(e) => setNewClientPhone(e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">CPF</label>
                <input
                  type="text"
                  placeholder="000.000.000-00"
                  className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                  value={newClientCpf}
                  onChange={(e) => setNewClientCpf(e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">RG</label>
                <input
                  type="text"
                  placeholder="00.000.000-0"
                  className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                  value={newClientRg}
                  onChange={(e) => setNewClientRg(e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Cidade</label>
                <input
                  type="text"
                  placeholder="São Paulo - SP"
                  className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                  value={newClientCity}
                  onChange={(e) => setNewClientCity(e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Endereço Completo</label>
                <textarea
                  placeholder="Rua, número, bairro..."
                  className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none resize-none"
                  rows={2}
                  value={newClientAddress}
                  onChange={(e) => setNewClientAddress(e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Endereço de Cobrança</label>
                <textarea
                  placeholder="Rua, número, cidade..."
                  className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none resize-none"
                  rows={2}
                  value={newClientBillingAddress}
                  onChange={(e) => setNewClientBillingAddress(e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Profissão</label>
                <input
                  type="text"
                  placeholder="Ex: Vendedor(a), Empresário(a)..."
                  className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                  value={newClientProfession}
                  onChange={(e) => setNewClientProfession(e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Telefone do Local de Trabalho</label>
                <input
                  type="tel"
                  placeholder="(11) 3333-3333"
                  className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                  value={newClientWorkPhone}
                  onChange={(e) => setNewClientWorkPhone(e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Endereço do Local de Trabalho</label>
                <textarea
                  placeholder="Rua, número, bairro, cidade..."
                  className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none resize-none"
                  rows={2}
                  value={newClientWorkAddress}
                  onChange={(e) => setNewClientWorkAddress(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateClientModal(false);
                  setNewClientName('');
                  setNewClientPhone('');
                  setNewClientCpf('');
                  setNewClientRg('');
                  setNewClientCity('');
                  setNewClientAddress('');
                  setNewClientBillingAddress('');
                  setNewClientProfession('');
                  setNewClientWorkPhone('');
                  setNewClientWorkAddress('');
                }}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-3 rounded-lg font-semibold hover:bg-gray-400 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateClient}
                className="flex-1 bg-purple-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-purple-700 transition"
              >
                ✅ Criar Cliente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição de Venda (Global) */}
      {editingSale && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setEditingSale(null)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 relative" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setEditingSale(null)}
              className="absolute top-2 right-2 text-2xl text-gray-400 hover:text-gray-700"
              title="Fechar"
            >×</button>
            <h2 className="text-2xl font-bold mb-4 text-purple-700">✏️ Editar Venda</h2>
            
            <div className="bg-gray-100 rounded-lg p-3 mb-4 text-sm">
              <p className="text-gray-600">👤 Cliente: <span className="font-semibold">{editingSale.client?.name || 'Não identificado'}</span></p>
              <p className="text-gray-600">📅 Data: {new Date(editingSale.saleDate || editingSale.date).toLocaleDateString('pt-BR')}</p>
            </div>
            
            {/* Formulário de Edição */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">💎 Nome do Item *</label>
                <input
                  type="text"
                  value={editSaleFormGlobal.itemName}
                  onChange={e => setEditSaleFormGlobal({...editSaleFormGlobal, itemName: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Ex: Anel de Ouro"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">📦 Código</label>
                  <input
                    type="text"
                    value={editSaleFormGlobal.itemCode}
                    onChange={e => setEditSaleFormGlobal({...editSaleFormGlobal, itemCode: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Código do item"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">💰 Valor Total *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editSaleFormGlobal.totalValue}
                    onChange={e => setEditSaleFormGlobal({...editSaleFormGlobal, totalValue: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="0,00"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">👤 Vendedor</label>
                <input
                  type="text"
                  value={editSaleFormGlobal.sellerName}
                  onChange={e => setEditSaleFormGlobal({...editSaleFormGlobal, sellerName: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Nome do vendedor"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">📝 Observações</label>
                <textarea
                  value={editSaleFormGlobal.observations}
                  onChange={e => setEditSaleFormGlobal({...editSaleFormGlobal, observations: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  rows={2}
                  placeholder="Observações sobre a venda"
                />
              </div>
              
              <div className="flex items-center gap-3 bg-orange-50 p-3 rounded-lg border border-orange-200">
                <input
                  type="checkbox"
                  id="editIsExchangeGlobal"
                  checked={editSaleFormGlobal.isExchange}
                  onChange={e => setEditSaleFormGlobal({...editSaleFormGlobal, isExchange: e.target.checked})}
                  className="w-5 h-5 text-orange-500 rounded focus:ring-orange-500"
                />
                <label htmlFor="editIsExchangeGlobal" className="text-sm font-semibold text-orange-700 cursor-pointer">
                  🔄 Esta é uma TROCA
                </label>
              </div>
              
              {/* Edição de Parcelas */}
              {editInstallmentsGlobal.length > 0 && (
                <div className="border-t pt-4 mt-2">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">📅 Parcelas</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {editInstallmentsGlobal.map((inst, idx) => (
                      <div key={inst.id} className={`flex items-center gap-2 p-2 rounded-lg ${inst.paid ? 'bg-green-50' : 'bg-gray-50'}`}>
                        <span className="text-xs font-semibold text-gray-500 w-8">#{inst.sequence}</span>
                        <input
                          type="number"
                          step="0.01"
                          value={inst.amount}
                          onChange={e => {
                            const updated = [...editInstallmentsGlobal];
                            updated[idx] = {...updated[idx], amount: parseFloat(e.target.value) || 0};
                            setEditInstallmentsGlobal(updated);
                          }}
                          disabled={inst.paid}
                          className={`flex-1 px-2 py-1 text-sm border rounded ${inst.paid ? 'bg-gray-200 text-gray-500' : 'border-gray-300 focus:ring-2 focus:ring-purple-500'}`}
                          placeholder="Valor"
                        />
                        <input
                          type="date"
                          value={inst.dueDate}
                          onChange={e => {
                            const updated = [...editInstallmentsGlobal];
                            updated[idx] = {...updated[idx], dueDate: e.target.value};
                            setEditInstallmentsGlobal(updated);
                          }}
                          disabled={inst.paid}
                          className={`px-2 py-1 text-sm border rounded ${inst.paid ? 'bg-gray-200 text-gray-500' : 'border-gray-300 focus:ring-2 focus:ring-purple-500'}`}
                        />
                        {inst.paid && (
                          <span className="text-xs bg-green-500 text-white px-2 py-1 rounded font-semibold">PAGA</span>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">* Parcelas pagas não podem ser editadas</p>
                </div>
              )}
              
              {/* Seção de Renegociação Global */}
              <div className="border-t pt-4 mt-4">
                <button
                  onClick={() => setShowRenegotiateGlobal(!showRenegotiateGlobal)}
                  className="w-full bg-blue-100 hover:bg-blue-200 text-blue-700 px-4 py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2"
                >
                  🔄 {showRenegotiateGlobal ? 'Fechar Renegociação' : 'Renegociar / Adicionar Parcelas'}
                </button>
                
                {showRenegotiateGlobal && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-semibold text-blue-800 mb-3">➕ Adicionar Novas Parcelas</h4>
                    <p className="text-xs text-blue-600 mb-3">Adicione valor extra dividido em novas parcelas (isso NÃO altera as parcelas existentes)</p>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-semibold text-blue-700 mb-1">💰 Valor a Adicionar</label>
                        <input
                          type="number"
                          step="0.01"
                          value={renegotiateFormGlobal.totalValue}
                          onChange={e => setRenegotiateFormGlobal({...renegotiateFormGlobal, totalValue: e.target.value})}
                          className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Ex: 500.00"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-semibold text-blue-700 mb-1">📊 Qtd. Parcelas</label>
                          <input
                            type="number"
                            min="1"
                            value={renegotiateFormGlobal.installments}
                            onChange={e => setRenegotiateFormGlobal({...renegotiateFormGlobal, installments: e.target.value})}
                            className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Ex: 3"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-blue-700 mb-1">📅 Início</label>
                          <input
                            type="date"
                            value={renegotiateFormGlobal.startDate}
                            onChange={e => setRenegotiateFormGlobal({...renegotiateFormGlobal, startDate: e.target.value})}
                            className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                      
                      {renegotiateFormGlobal.totalValue && renegotiateFormGlobal.installments && (
                        <p className="text-sm text-blue-700 bg-blue-100 p-2 rounded">
                          📌 Cada nova parcela: <strong>R$ {(parseFloat(renegotiateFormGlobal.totalValue || '0') / parseInt(renegotiateFormGlobal.installments || '1')).toFixed(2)}</strong>
                        </p>
                      )}
                      
                      <button
                        onClick={handleRenegotiateGlobal}
                        disabled={isRenegotiatingGlobal || !renegotiateFormGlobal.totalValue || !renegotiateFormGlobal.startDate}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-semibold transition disabled:opacity-50"
                      >
                        {isRenegotiatingGlobal ? '⏳ Processando...' : '✅ Confirmar Renegociação'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditingSale(null)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-3 rounded-lg font-semibold transition"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (editingSale.client?.id) {
                    setSelectedClientForModal(editingSale.client);
                    setClientSalesForModal([editingSale]);
                    setEditingSale(null);
                  }
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-lg font-semibold transition"
              >
                📋 Carnê
              </button>
              <button
                onClick={handleSaveEditSaleGlobal}
                disabled={isSavingEditGlobal || !editSaleFormGlobal.itemName || !editSaleFormGlobal.totalValue}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-semibold transition disabled:opacity-50"
              >
                {isSavingEditGlobal ? '⏳ Salvando...' : '✅ Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rodapé com Versão */}
      <footer className="bg-purple-800 text-white text-center py-4 mt-8 border-t-2 border-purple-500">
        <p className="text-sm font-semibold">
          💎 Joias Vendas
        </p>
        <p className="text-xs mt-1 text-purple-200">
          {APP_VERSION} • Compilado em {APP_BUILD_DATE} às {APP_BUILD_TIME}
        </p>
      </footer>
    </div>
  );
}

function NovaVendaPage({ token, onSuccess, clients }: { token: string, onSuccess: () => void, clients: any[] }) {
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientCpf, setClientCpf] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientCity, setClientCity] = useState('');
  const [clientRg, setClientRg] = useState('');
  const [clientBillingAddress, setClientBillingAddress] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [showNewClient, setShowNewClient] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [itemName, setItemName] = useState('');
  const [itemSearch, setItemSearch] = useState('');
  const [showItemSuggestions, setShowItemSuggestions] = useState(false);
  const [showcaseItems, setShowcaseItems] = useState<any[]>([]);
  const [showShareModal, setShowShareModal] = useState(false);
  const [createdSale, setCreatedSale] = useState<any>(null);
  const [createdClient, setCreatedClient] = useState<any>(null);
  const [itemCode, setItemCode] = useState('');
  const [factor, setFactor] = useState('');
  const [itemType, setItemType] = useState<'leilao' | 'novo'>('leilao');
  const [baseValue, setBaseValue] = useState('');
  const [totalValue, setTotalValue] = useState('');
  const [installments, setInstallments] = useState(1);
  const [discountValue, setDiscountValue] = useState('');
  const [photo, setPhoto] = useState('');
  const [sendCard, setSendCard] = useState(true);
  const [roundUpInstallments, setRoundUpInstallments] = useState(false);
  const [roundUpTotal, setRoundUpTotal] = useState(false);
  const [customInstallmentValues, setCustomInstallmentValues] = useState<number[]>([]);
  const [sellerName, setSellerName] = useState('');
  const [sellers, setSellers] = useState<string[]>([]);
  const [showSellerSuggestions, setShowSellerSuggestions] = useState(false);
  
  // Estados para múltiplos itens (carrinho sempre ativo)
  const useMultipleItems = true; // Carrinho sempre ativo
  const [saleItems, setSaleItems] = useState<Array<{
    itemName: string;
    itemCode?: string;
    factor?: number;
    baseValue?: number;
    quantity: number;
    unitPrice: number;
    totalValue: number;
    installmentsPerItem?: number;
  }>>([]);
  const [currentItem, setCurrentItem] = useState({
    itemName: '',
    itemCode: '',
    factor: '',
    baseValue: '',
    quantity: '1',
    installmentsPerItem: '1',
    unitPrice: ''
  });
  const [firstPaymentDate, setFirstPaymentDate] = useState(() => {
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    return nextMonth.toISOString().split('T')[0].substring(0, 7); // YYYY-MM
  });
  
  // Estado para marcar como troca e valor final editável
  const [isExchange, setIsExchange] = useState(false);
  const [finalValueOverride, setFinalValueOverride] = useState('');

  // Carregar vendedoras já usadas
  useEffect(() => {
    const loadSellers = async () => {
      try {
        const res = await fetch('/api/sales/sellers', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setSellers(Array.isArray(data) ? data.filter((s: any) => s) : []);
      } catch (error) {
        console.error('Erro ao carregar vendedoras:', error);
      }
    };
    loadSellers();
  }, [token]);

  // Carregar produtos do mostruário
  useEffect(() => {
    const loadShowcaseItems = async () => {
      try {
        const res = await fetch('/api/showcase', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setShowcaseItems(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Erro ao carregar mostruário:', error);
      }
    };
    loadShowcaseItems();
  }, [token]);

  // Recalcular valores das parcelas quando mudar número de parcelas ou valor total
  useEffect(() => {
    if (installments > 0 && totalValue && parseFloat(totalValue) > 0) {
      const total = parseFloat(totalValue);
      const parcelaExata = total / installments;
      const parcelaArredondada = Math.ceil(parcelaExata);
      const somaArredondada = parcelaArredondada * (installments - 1);
      const ultimaParcelaArredondada = total - somaArredondada;
      
      const valores = [];
      for (let i = 0; i < installments; i++) {
        if (roundUpInstallments) {
          valores.push(i === installments - 1 ? ultimaParcelaArredondada : parcelaArredondada);
        } else {
          valores.push(parcelaExata);
        }
      }
      setCustomInstallmentValues(valores);
    }
  }, [installments, totalValue, roundUpInstallments]);

  // Calcular valor automaticamente quando factor ou baseValue mudar
  useEffect(() => {
    const factorNum = parseFloat(factor);
    const baseNum = parseFloat(baseValue);
    if (!isNaN(factorNum) && !isNaN(baseNum) && factorNum > 0 && baseNum > 0) {
      const calculatedValue = factorNum * baseNum;
      const finalValue = roundUpTotal ? Math.ceil(calculatedValue) : calculatedValue;
      setTotalValue(finalValue.toFixed(2));
    }
  }, [factor, baseValue, roundUpTotal]);

  // Atualizar total quando múltiplos itens mudarem
  useEffect(() => {
    if (useMultipleItems && saleItems.length > 0) {
      const subtotal = saleItems.reduce((sum, item) => sum + item.totalValue, 0);
      const discount = parseFloat(discountValue) || 0;
      setTotalValue((subtotal - discount).toFixed(2));
    }
  }, [saleItems, discountValue, useMultipleItems]);

  // Atualizar valor do item atual quando factor ou baseValue mudar
  useEffect(() => {
    const factorNum = parseFloat(currentItem.factor);
    const baseNum = parseFloat(currentItem.baseValue);
    const quantity = parseInt(currentItem.quantity) || 1;
    
    if (!isNaN(factorNum) && !isNaN(baseNum) && factorNum > 0 && baseNum > 0) {
      const unitPrice = factorNum * baseNum;
      setCurrentItem(prev => ({ ...prev, unitPrice: unitPrice.toFixed(2) }));
    }
  }, [currentItem.factor, currentItem.baseValue, currentItem.quantity]);

  const addItemToSale = () => {
    if (!currentItem.itemName || !currentItem.unitPrice || parseFloat(currentItem.unitPrice) <= 0) {
      alert('Preencha o nome e valor do item');
      return;
    }

    const quantity = parseInt(currentItem.quantity) || 1;
    const unitPrice = parseFloat(currentItem.unitPrice);
    const installmentsPerItem = parseInt(currentItem.installmentsPerItem) || 1;
    const totalValue = unitPrice * quantity;

    const newItem = {
      itemName: currentItem.itemName,
      itemCode: currentItem.itemCode || undefined,
      factor: currentItem.factor ? parseFloat(currentItem.factor) : undefined,
      baseValue: currentItem.baseValue ? parseFloat(currentItem.baseValue) : undefined,
      quantity,
      unitPrice,
      totalValue,
      installmentsPerItem
    };

    setSaleItems([...saleItems, newItem]);
    
    // Limpar formulário do item
    setCurrentItem({
      itemName: '',
      itemCode: '',
      factor: '',
      baseValue: '',
      quantity: '1',
      installmentsPerItem: '1',
      unitPrice: ''
    });
    setItemSearch('');
  };

  const removeItemFromSale = (index: number) => {
    setSaleItems(saleItems.filter((_, i) => i !== index));
  };

  const normalizedFilter = clientFilter.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
  const phoneFilter = clientFilter.replace(/\D/g, '');
  const filteredClientsList = clients
    .filter(c => {
      const nameNorm = c.name.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
      return (
        (normalizedFilter && (nameNorm.startsWith(normalizedFilter) || nameNorm.includes(normalizedFilter))) ||
        (phoneFilter && (c.phone.startsWith(phoneFilter) || c.phone.includes(phoneFilter)))
      );
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  const handleSelectClient = (client: any) => {
    setSelectedClient(client);
    setClientName(client.name);
    setClientPhone(client.phone);
    setClientFilter('');
    setShowNewClient(false);
    setShowSuggestions(false);
  };

  const handleSelectShowcaseItem = (item: any) => {
    setItemName(item.itemName);
    setItemCode(item.itemCode || '');
    setFactor(String(item.factor || ''));
    setBaseValue(String(item.baseValue || ''));
    setPhoto(item.imageUrl || '');
    setItemSearch('');
    setShowItemSuggestions(false);
  };

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setPhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    // Validação: precisa de cliente e pelo menos um item no carrinho
    if (!clientName) {
      alert('Preencha o nome do cliente');
      return;
    }
    
    if (saleItems.length === 0) {
      alert('Adicione pelo menos um produto ao carrinho');
      return;
    }

    try {
      let clientId = selectedClient?.id;
      
      // Se não selecionou cliente, precisa criar
      if (!clientId) {
        const clientRes = await fetch('/api/clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ 
            name: clientName, 
            phone: clientPhone || '0000000000',
            cpf: clientCpf || null,
            rg: clientRg || null,
            city: clientCity || null,
            address: clientAddress || null,
            billingAddress: clientBillingAddress || null
          })
        });
        
        if (!clientRes.ok) {
          alert('Erro ao criar/buscar cliente');
          return;
        }
        
        const client = await clientRes.json();
        clientId = client.id;
      }
      
      // Calcular valor final (usa override se preenchido, senão calcula)
      const calculatedTotal = saleItems.reduce((sum, item) => sum + item.totalValue, 0) - (parseFloat(discountValue) || 0);
      const valorFinal = finalValueOverride && parseFloat(finalValueOverride) > 0 
        ? parseFloat(finalValueOverride) 
        : calculatedTotal;
      
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          clientId,
          itemName: useMultipleItems && saleItems.length > 0 
            ? (isExchange ? '🔄 TROCA: ' : '') + saleItems.map(i => i.itemName).join(', ') 
            : itemName,
          itemCode: itemCode || null,
          factor: factor ? parseFloat(factor) : null,
          itemType: itemType || null,
          baseValue: baseValue ? parseFloat(baseValue) : null,
          totalValue: valorFinal,
          paymentMethod: 'Parcelado',
          installments,
          roundUpInstallments: roundUpInstallments && installments > 1,
          customInstallmentValues: customInstallmentValues.length === installments ? customInstallmentValues : null,
          saleDate: new Date(),
          imageBase64: photo,
          sendCard: sendCard && installments > 1,
          sellerName: sellerName || null,
          items: useMultipleItems ? saleItems : null,
          discount: useMultipleItems && discountValue ? parseFloat(discountValue) : 0,
          firstPaymentDate: installments > 1 ? firstPaymentDate : null,
          isExchange: isExchange
        })
      });
      
      if (res.ok) {
        const saleData = await res.json();
        
        // Buscar dados completos da venda com parcelas
        const saleRes = await fetch(`/api/clients/${clientId}/sales`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const sales = await saleRes.json();
        const fullSale = sales.find((s: any) => s.id === saleData.id) || {
          ...saleData,
          installmentsR: Array.from({ length: installments }, (_, i) => ({
            sequence: i + 1,
            amount: parseFloat(totalValue) / installments,
            dueDate: new Date(new Date().setMonth(new Date().getMonth() + i)),
            paid: false
          }))
        };
        
        // Guardar dados para o modal
        setCreatedSale(fullSale);
        setCreatedClient({ 
          id: clientId, 
          name: clientName, 
          phone: clientPhone || selectedClient?.phone || ''
        });
        setShowShareModal(true);
        
        // Limpar formulário
        setSelectedClient(null);
        setClientName('');
        setClientPhone('');
        setClientFilter('');
        setShowNewClient(false);
        setItemName('');
        setItemCode('');
        setFactor('');
        setItemType('leilao');
        setBaseValue('');
        setTotalValue('');
        setPhoto('');
        setRoundUpInstallments(false);
        setInstallments(1);
        setCustomInstallmentValues([]);
        setClientCpf('');
        setClientRg('');
        setClientCity('');
        setClientAddress('');
        setClientBillingAddress('');
        setSellerName('');
        setSaleItems([]);
        setDiscountValue('');
        setIsExchange(false);
        setFinalValueOverride('');
        setCurrentItem({
          itemName: '',
          itemCode: '',
          factor: '',
          baseValue: '',
          quantity: '1',
          installmentsPerItem: '1',
          unitPrice: ''
        });
        // Resetar data do primeiro pagamento para próximo mês
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        setFirstPaymentDate(nextMonth.toISOString().split('T')[0].substring(0, 7));
      } else {
        const error = await res.json();
        alert('Erro ao registrar venda: ' + (error.message || 'Erro desconhecido'));
      }
    } catch (error) {
      alert('Erro: ' + error);
    }
  };

  const handleCloseShareModal = () => {
    setShowShareModal(false);
    setCreatedSale(null);
    setCreatedClient(null);
    onSuccess();
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">➕ Registrar Nova Venda</h2>

      {/* Modal de Compartilhamento */}
      {showShareModal && createdSale && createdClient && (
        <ShareCarneModal 
          sale={createdSale} 
          client={createdClient} 
          onClose={handleCloseShareModal} 
        />
      )}
      
      {/* Seleção de Cliente */}
      <div className="mb-6">
        <label className="block font-semibold mb-2">👥 Cliente</label>
        {selectedClient ? (
          <div className="flex gap-2 items-center">
            <div className="flex-1 bg-purple-50 border-2 border-purple-300 p-3 rounded-lg">
              <p className="font-semibold text-gray-800">{selectedClient.name}</p>
              <p className="text-sm text-gray-600">{selectedClient.phone}</p>
            </div>
            <button 
              onClick={() => {
                setSelectedClient(null);
                setClientName('');
                setClientPhone('');
                setClientFilter('');
              }}
              className="bg-red-500 text-white px-3 py-3 rounded-lg hover:bg-red-600">
              ✕
            </button>
          </div>
        ) : (
          <div className="relative">
            <input 
              type="text" 
              placeholder="🔍 Digite o nome ou telefone do cliente..." 
              className="w-full p-3 border-2 border-gray-300 rounded-lg mb-2 focus:border-purple-500 focus:outline-none"
              value={clientFilter}
              onChange={(e) => {
                setClientFilter(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              autoComplete="off"
            />
            {showSuggestions && clientFilter && filteredClientsList.length > 0 && (
              <div className="absolute z-10 w-full border-2 border-purple-300 rounded-lg bg-white shadow-xl max-h-64 overflow-y-auto">
                <div className="sticky top-0 bg-purple-50 px-3 py-2 border-b border-purple-200">
                  <p className="text-xs font-semibold text-purple-700">
                    {filteredClientsList.length} cliente(s) encontrado(s)
                  </p>
                </div>
                {filteredClientsList.slice(0, 10).map(client => (
                  <button
                    key={client.id}
                    onClick={() => {
                      handleSelectClient(client);
                      setShowSuggestions(false);
                    }}
                    className="w-full text-left p-3 hover:bg-purple-50 border-b last:border-b-0 transition"
                  >
                    <p className="font-semibold text-gray-800">{client.name}</p>
                    <p className="text-sm text-gray-600">{client.phone}</p>
                    {client.city && <p className="text-xs text-gray-500">📍 {client.city}</p>}
                  </button>
                ))}
                {filteredClientsList.length > 10 && (
                  <div className="p-2 text-center text-xs text-gray-500 bg-gray-50">
                    + {filteredClientsList.length - 10} cliente(s) a mais... Continue digitando para refinar
                  </div>
                )}
              </div>
            )}
            {!showNewClient && (
              <button
                onClick={() => setShowNewClient(true)}
                className="w-full mt-2 bg-blue-50 text-blue-600 p-3 rounded-lg border border-blue-200 hover:bg-blue-100 font-semibold"
              >
                + Criar Novo Cliente
              </button>
            )}
          </div>
        )}
        
        {showNewClient && !selectedClient && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-3">Novo Cliente</h3>
            <input 
              type="text" 
              placeholder="Nome do cliente" 
              className="w-full p-2 border rounded-lg mb-2"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
            />
            <input 
              type="tel" 
              placeholder="Telefone/WhatsApp" 
              className="w-full p-2 border rounded-lg mb-2"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
            />
            <input 
              type="text" 
              placeholder="CPF (opcional)" 
              className="w-full p-2 border rounded-lg mb-2"
              value={clientCpf}
              onChange={(e) => setClientCpf(e.target.value)}
            />
            <input 
              type="text" 
              placeholder="RG (opcional)" 
              className="w-full p-2 border rounded-lg mb-2"
              value={clientRg}
              onChange={(e) => setClientRg(e.target.value)}
            />
            <input 
              type="text" 
              placeholder="Cidade (opcional)" 
              className="w-full p-2 border rounded-lg mb-2"
              value={clientCity}
              onChange={(e) => setClientCity(e.target.value)}
            />
            <textarea 
              placeholder="Endereço completo (opcional)" 
              className="w-full p-2 border rounded-lg mb-2 h-20 resize-none"
              value={clientAddress}
              onChange={(e) => setClientAddress(e.target.value)}
            />
            <textarea 
              placeholder="Endereço de cobrança (rua, número, cidade)" 
              className="w-full p-2 border rounded-lg mb-2 h-20 resize-none"
              value={clientBillingAddress}
              onChange={(e) => setClientBillingAddress(e.target.value)}
            />
            <button
              onClick={() => setShowNewClient(false)}
              className="w-full mt-2 bg-gray-300 text-gray-700 p-2 rounded-lg hover:bg-gray-400"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>

      {/* Campo de Vendedora */}
      <div className="mb-6 p-4 bg-pink-50 border-2 border-pink-200 rounded-xl">
        <label className="block font-bold text-pink-800 mb-2">💅 Nome da Vendedora</label>
        <div className="relative">
          <input 
            type="text" 
            className="w-full p-3 border-2 border-pink-300 rounded-lg focus:border-pink-500 focus:outline-none" 
            placeholder="Digite ou selecione o nome da vendedora..." 
            value={sellerName} 
            onChange={(e) => {
              setSellerName(e.target.value);
              setShowSellerSuggestions(true);
            }}
            onFocus={() => setShowSellerSuggestions(true)}
            autoComplete="off"
          />
          {showSellerSuggestions && sellerName && sellers.filter((s) => 
            s.toLowerCase().includes(sellerName.toLowerCase())
          ).length > 0 && (
            <div className="absolute z-10 w-full mt-1 border-2 border-pink-300 rounded-lg bg-white shadow-xl max-h-40 overflow-y-auto">
              <div className="sticky top-0 bg-pink-50 px-3 py-2 border-b border-pink-200">
                <p className="text-xs font-semibold text-pink-700">
                  {sellers.filter((s) => s.toLowerCase().includes(sellerName.toLowerCase())).length} vendedora(s) encontrada(s)
                </p>
              </div>
              {sellers
                .filter((s) => s.toLowerCase().includes(sellerName.toLowerCase()))
                .slice(0, 8)
                .map((seller) => (
                  <button
                    key={seller}
                    onClick={() => {
                      setSellerName(seller);
                      setShowSellerSuggestions(false);
                    }}
                    className="w-full text-left p-3 hover:bg-pink-50 border-b last:border-b-0 transition font-semibold text-pink-700"
                  >
                    💅 {seller}
                  </button>
                ))}
            </div>
          )}
        </div>
        <p className="text-xs text-pink-600 mt-1">Este nome aparecerá em todos os relatórios e na relação de cobrança</p>
      </div>

      {/* Seção de Carrinho de Compras */}
      <div className="mb-6 space-y-6">
        {/* Formulário para adicionar item */}
        <div className="p-6 bg-gradient-to-br from-white to-purple-50 border-2 border-purple-300 rounded-xl shadow-md">
          <h3 className="font-bold text-purple-800 mb-4 text-lg flex items-center gap-2">
            <span className="text-2xl">🛒</span> Adicionar Produto ao Carrinho
          </h3>
          
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold mb-1 text-gray-700">Nome do Produto *</label>
                <input 
                  type="text" 
                  className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none" 
                  placeholder="Ex: Anel de formatura, Brinco de pérola..." 
                  value={currentItem.itemName} 
                  onChange={(e) => setCurrentItem({...currentItem, itemName: e.target.value})} 
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-700">Código</label>
                <input 
                  type="text" 
                  className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none" 
                  placeholder="Opcional" 
                  value={currentItem.itemCode} 
                  onChange={(e) => setCurrentItem({...currentItem, itemCode: e.target.value})} 
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-700">Fator</label>
                <input 
                  type="number" 
                  step="0.1"
                  className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none" 
                  placeholder="Ex: 3.5" 
                  value={currentItem.factor} 
                  onChange={(e) => setCurrentItem({...currentItem, factor: e.target.value})} 
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-700">Valor Base (R$)</label>
                <input 
                  type="number" 
                  step="0.01"
                  className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none" 
                  placeholder="0.00" 
                  value={currentItem.baseValue} 
                  onChange={(e) => setCurrentItem({...currentItem, baseValue: e.target.value})} 
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold mb-1 text-gray-700">Valor Unitário (R$) *</label>
                <input 
                  type="number" 
                  step="0.01"
                  className="w-full p-3 border-2 border-green-400 rounded-lg font-bold text-lg text-green-700 focus:border-green-500 focus:outline-none" 
                  placeholder="0.00" 
                  value={currentItem.unitPrice} 
                  onChange={(e) => setCurrentItem({...currentItem, unitPrice: e.target.value})} 
                />
                <p className="text-xs text-gray-500 mt-1">Calculado automaticamente (Fator × Base) ou digite manualmente</p>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-700">Parcelas deste produto</label>
                <input 
                  type="number" 
                  min="1"
                  className="w-full p-3 border-2 border-blue-400 rounded-lg font-semibold text-blue-700 focus:border-blue-500 focus:outline-none" 
                  placeholder="1" 
                  value={currentItem.installmentsPerItem} 
                  onChange={(e) => setCurrentItem({...currentItem, installmentsPerItem: e.target.value})} 
                />
              </div>

              {currentItem.unitPrice && parseFloat(currentItem.unitPrice) > 0 && (
                <div className="md:col-span-2 bg-green-50 p-4 rounded-lg border-2 border-green-300">
                  <p className="text-sm text-gray-700 mb-1">
                    <strong>Subtotal deste item:</strong> {currentItem.quantity || 1} × R$ {parseFloat(currentItem.unitPrice).toFixed(2)} {currentItem.installmentsPerItem && parseInt(currentItem.installmentsPerItem) > 1 ? `em ${currentItem.installmentsPerItem}x` : ''}
                  </p>
                  <p className="text-2xl font-bold text-green-600">
                    R$ {((parseInt(currentItem.quantity) || 1) * parseFloat(currentItem.unitPrice)).toFixed(2)}
                  </p>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={addItemToSale}
              className="w-full mt-4 bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 font-bold text-lg shadow-lg transition-all hover:scale-[1.02]"
            >
              ➕ Adicionar ao Carrinho
            </button>
          </div>

          {/* Carrinho - Grade de Produtos */}
          {saleItems.length > 0 && (
            <div className="bg-white border-2 border-green-400 rounded-xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white p-4">
                <h3 className="font-bold text-xl flex items-center gap-2">
                  <span className="text-2xl">🛒</span> Carrinho de Compras ({saleItems.length} {saleItems.length === 1 ? 'produto' : 'produtos'})
                </h3>
              </div>

              {/* Tabela de Produtos - Desktop */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100 border-b-2 border-gray-300">
                    <tr>
                      <th className="text-left p-3 font-bold text-gray-700">Produto</th>
                      <th className="text-center p-3 font-bold text-gray-700">Código</th>
                      <th className="text-center p-3 font-bold text-gray-700">Qtd</th>
                      <th className="text-center p-3 font-bold text-gray-700">Parcelas</th>
                      <th className="text-right p-3 font-bold text-gray-700">Valor Unit.</th>
                      <th className="text-right p-3 font-bold text-gray-700">Total</th>
                      <th className="text-center p-3 font-bold text-gray-700">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {saleItems.map((item, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50 transition">
                        <td className="p-3">
                          <p className="font-semibold text-gray-800">{item.itemName}</p>
                          {item.factor && item.baseValue && (
                            <p className="text-xs text-gray-500">Fator: {item.factor} × R$ {item.baseValue.toFixed(2)}</p>
                          )}
                        </td>
                        <td className="p-3 text-center text-gray-600">{item.itemCode || '—'}</td>
                        <td className="p-3 text-center font-semibold text-blue-600">{item.quantity}×</td>
                        <td className="p-3 text-center">
                          <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-semibold text-sm">
                            {item.installmentsPerItem}× parcelas
                          </span>
                        </td>
                        <td className="p-3 text-right font-semibold text-green-600">R$ {item.unitPrice.toFixed(2)}</td>
                        <td className="p-3 text-right font-bold text-green-700 text-lg">R$ {item.totalValue.toFixed(2)}</td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => removeItemFromSale(index)}
                            className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition"
                            title="Remover produto"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Cards de Produtos - Mobile */}
              <div className="md:hidden p-4 space-y-3">
                {saleItems.map((item, index) => (
                  <div key={index} className="bg-gray-50 p-4 rounded-lg border-2 border-gray-200">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <p className="font-bold text-gray-800">{item.itemName}</p>
                        {item.itemCode && <p className="text-xs text-gray-600">Código: {item.itemCode}</p>}
                      </div>
                      <button
                        onClick={() => removeItemFromSale(index)}
                        className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 ml-2"
                      >
                        🗑️
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-600">Quantidade:</span>
                        <span className="font-semibold ml-1">{item.quantity}×</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Parcelas:</span>
                        <span className="font-semibold ml-1">{item.installmentsPerItem}×</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Valor Unit.:</span>
                        <span className="font-semibold text-green-600 ml-1">R$ {item.unitPrice.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Total:</span>
                        <span className="font-bold text-green-700 text-lg ml-1">R$ {item.totalValue.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Resumo do Carrinho */}
              <div className="bg-gradient-to-br from-gray-50 to-blue-50 p-6 border-t-2 border-gray-300">
                <div className="max-w-md ml-auto space-y-3">
                  <div className="flex justify-between items-center text-lg">
                    <span className="font-semibold text-gray-700">Subtotal ({saleItems.length} {saleItems.length === 1 ? 'item' : 'itens'}):</span>
                    <span className="text-2xl font-bold text-gray-800">
                      R$ {saleItems.reduce((sum, item) => sum + item.totalValue, 0).toFixed(2)}
                    </span>
                  </div>

                  {/* Marcador de Troca */}
                  <label className="flex items-center gap-3 cursor-pointer p-3 bg-orange-50 rounded-lg border-2 border-orange-300 hover:border-orange-400 transition">
                    <input 
                      type="checkbox" 
                      checked={isExchange} 
                      onChange={(e) => setIsExchange(e.target.checked)} 
                      className="w-6 h-6 accent-orange-600" 
                    />
                    <div>
                      <span className="font-semibold text-orange-800">🔄 Esta é uma TROCA</span>
                      <p className="text-xs text-orange-600 mt-1">
                        Marque se o cliente está trocando por outra peça
                      </p>
                    </div>
                  </label>

                  {/* Campo de desconto */}
                  <div className="bg-yellow-50 p-4 rounded-lg border-2 border-yellow-300">
                    <label className="block text-sm font-bold mb-2 text-yellow-800">💰 Desconto (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      className="w-full p-3 border-2 border-yellow-400 rounded-lg text-lg font-bold text-red-600 focus:border-yellow-500 focus:outline-none"
                    />
                  </div>

                  {discountValue && parseFloat(discountValue) > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-red-600">Desconto:</span>
                      <span className="text-xl font-bold text-red-600">
                        - R$ {parseFloat(discountValue).toFixed(2)}
                      </span>
                    </div>
                  )}

                  {/* Valor Final Calculado + Campo Editável */}
                  <div className="p-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg shadow-lg">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-lg font-bold">Valor Calculado:</span>
                      <span className="text-2xl font-bold">
                        R$ {(saleItems.reduce((sum, item) => sum + item.totalValue, 0) - (parseFloat(discountValue) || 0)).toFixed(2)}
                      </span>
                    </div>
                    
                    <div className="bg-white/20 p-3 rounded-lg">
                      <label className="block text-sm font-semibold mb-2 text-white/90">✏️ Valor Final (editável - para arredondamento)</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder={`${(saleItems.reduce((sum, item) => sum + item.totalValue, 0) - (parseFloat(discountValue) || 0)).toFixed(2)}`}
                        value={finalValueOverride}
                        onChange={(e) => setFinalValueOverride(e.target.value)}
                        className="w-full p-3 border-2 border-green-300 rounded-lg text-xl font-bold text-green-700 focus:border-green-500 focus:outline-none"
                      />
                      <p className="text-xs text-white/80 mt-2">
                        💡 Use para arredondar o valor conforme solicitado pelo vendedor
                      </p>
                    </div>
                    
                    {finalValueOverride && parseFloat(finalValueOverride) > 0 && (
                      <div className="mt-3 pt-3 border-t border-white/30">
                        <div className="flex justify-between items-center">
                          <span className="text-xl font-bold">VALOR FINAL:</span>
                          <span className="text-3xl font-bold">
                            R$ {parseFloat(finalValueOverride).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <p className="text-sm text-gray-600 text-center mt-3">
                    Configure as opções de pagamento abaixo 👇
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Seção de Finalização da Compra */}
          {saleItems.length > 0 && (
            <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-400 rounded-xl shadow-lg">
              <h3 className="font-bold text-blue-900 mb-4 text-xl flex items-center gap-2">
                <span className="text-2xl">💳</span> Como deseja pagar?
              </h3>

              <div className="space-y-4">
                {/* Número de Parcelas */}
                <div>
                  <label className="block font-bold text-gray-800 mb-2">📊 Número de Parcelas</label>
                  <input 
                    type="number" 
                    className="w-full p-3 border-2 border-blue-400 rounded-lg text-lg font-semibold focus:border-blue-600 focus:outline-none" 
                    min="1" 
                    value={installments} 
                    onChange={(e) => { 
                      setInstallments(parseInt(e.target.value)); 
                      if (parseInt(e.target.value) > 1) setDiscountValue(''); 
                    }} 
                    placeholder="Digite o número de parcelas" 
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    {installments > 1 
                      ? `Compra será dividida em ${installments}× parcelas`
                      : 'Pagamento à vista (1 parcela)'
                    }
                  </p>
                </div>

                {/* Data do Primeiro Pagamento (se parcelado) */}
                {installments > 1 && (
                  <div className="p-4 bg-white border-2 border-indigo-300 rounded-lg">
                    <label className="block font-bold text-indigo-800 mb-2">📅 Mês do Primeiro Pagamento</label>
                    <input 
                      type="month" 
                      className="w-full p-3 border-2 border-indigo-400 rounded-lg text-lg font-semibold focus:border-indigo-600 focus:outline-none" 
                      value={firstPaymentDate} 
                      onChange={(e) => setFirstPaymentDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0].substring(0, 7)}
                    />
                    <p className="text-sm text-indigo-700 mt-2">
                      ✨ Cliente inicia pagamento em {new Date(firstPaymentDate + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                )}

                {/* Desconto à Vista (se 1 parcela) */}
                {installments === 1 && (
                  <div className="p-4 bg-green-50 border-2 border-green-400 rounded-lg">
                    <h4 className="font-bold text-green-800 mb-3 flex items-center gap-2">
                      💰 Desconto para Pagamento à Vista
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold mb-1 text-green-700">Valor do Desconto (R$)</label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={discountValue}
                          onChange={(e) => setDiscountValue(e.target.value)}
                          className="w-full p-3 border-2 border-green-400 rounded-lg text-lg font-bold text-green-600 focus:border-green-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-1 text-green-700">Valor Final</label>
                        <div className="w-full p-3 bg-white border-2 border-green-500 rounded-lg text-lg font-bold text-green-600">
                          R$ {(saleItems.reduce((sum, item) => sum + item.totalValue, 0) - (parseFloat(discountValue) || 0)).toFixed(2)}
                        </div>
                      </div>
                    </div>
                    {discountValue && parseFloat(discountValue) > 0 && (
                      <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                        <span>✅</span>
                        <span>Desconto de R$ {parseFloat(discountValue).toFixed(2)} será aplicado</span>
                      </p>
                    )}
                  </div>
                )}

                {/* Opção de Arredondamento de Parcelas (se parcelado) */}
                {installments > 1 && (
                  <label className="flex items-center gap-3 cursor-pointer p-3 bg-white rounded-lg border-2 border-purple-200 hover:border-purple-400 transition">
                    <input 
                      type="checkbox" 
                      checked={roundUpInstallments} 
                      onChange={(e) => setRoundUpInstallments(e.target.checked)} 
                      className="w-6 h-6 accent-purple-600" 
                    />
                    <div>
                      <span className="font-semibold text-purple-800">⬆️ Arredondar parcelas para cima</span>
                      <p className="text-xs text-gray-600 mt-1">
                        Facilita o pagamento arredondando cada parcela para o valor inteiro mais próximo
                      </p>
                    </div>
                  </label>
                )}

                {/* Preview das Parcelas */}
                {installments > 1 && saleItems.length > 0 && (() => {
                  const valorBase = finalValueOverride && parseFloat(finalValueOverride) > 0 
                    ? parseFloat(finalValueOverride) 
                    : saleItems.reduce((sum, item) => sum + item.totalValue, 0) - (parseFloat(discountValue) || 0);
                  
                  // Se tem valores customizados, usar eles, senão calcular
                  const temValoresCustom = customInstallmentValues.length === installments;
                  const valorFinal = temValoresCustom 
                    ? customInstallmentValues.reduce((a, b) => a + b, 0)
                    : valorBase;
                  
                  const parcelaExata = valorBase / installments;
                  const parcelaArredondada = Math.ceil(parcelaExata);
                  const ultimaParcela = valorBase - (parcelaArredondada * (installments - 1));
                  
                  const [year, month] = firstPaymentDate.split('-').map(Number);
                  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
                  
                  // Gerar valores das parcelas
                  const getValorParcela = (index: number) => {
                    if (temValoresCustom) return customInstallmentValues[index];
                    if (roundUpInstallments) {
                      return index === installments - 1 ? ultimaParcela : parcelaArredondada;
                    }
                    return parcelaExata;
                  };
                  
                  // Função para editar uma parcela e redistribuir
                  const handleEditParcela = (index: number, novoValor: number) => {
                    const valores = temValoresCustom 
                      ? [...customInstallmentValues]
                      : Array.from({ length: installments }, (_, i) => getValorParcela(i));
                    
                    valores[index] = novoValor;
                    setCustomInstallmentValues(valores);
                    
                    // Atualizar o valor final override com a soma
                    const novoTotal = valores.reduce((a, b) => a + b, 0);
                    setFinalValueOverride(novoTotal.toFixed(2));
                  };
                  
                  // Função para redistribuir mantendo o total
                  const handleRedistribuir = (index: number, novoValor: number) => {
                    const valores = temValoresCustom 
                      ? [...customInstallmentValues]
                      : Array.from({ length: installments }, (_, i) => getValorParcela(i));
                    
                    const totalAtual = valores.reduce((a, b) => a + b, 0);
                    const diferenca = novoValor - valores[index];
                    
                    // Calcula quanto redistribuir nas outras parcelas
                    const outrasParcelas = installments - 1;
                    if (outrasParcelas > 0) {
                      const ajustePorParcela = diferenca / outrasParcelas;
                      
                      for (let i = 0; i < installments; i++) {
                        if (i === index) {
                          valores[i] = novoValor;
                        } else {
                          valores[i] = Math.max(0, valores[i] - ajustePorParcela);
                        }
                      }
                    } else {
                      valores[index] = novoValor;
                    }
                    
                    setCustomInstallmentValues(valores);
                  };
                  
                  return (
                    <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-300 rounded-xl">
                      <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                        📋 Preview das Parcelas
                        <span className="text-sm font-normal text-gray-500">({installments}×)</span>
                        {temValoresCustom && (
                          <button
                            onClick={() => setCustomInstallmentValues([])}
                            className="ml-auto text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded transition"
                            title="Resetar valores personalizados"
                          >
                            🔄 Resetar
                          </button>
                        )}
                      </h4>
                      
                      {/* Resumo */}
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className={`p-3 rounded-lg border-2 ${!roundUpInstallments && !temValoresCustom ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white'}`}>
                          <p className="text-xs text-gray-500 uppercase">Valor Exato</p>
                          <p className="font-bold text-lg text-gray-800">{installments}× R$ {parcelaExata.toFixed(2)}</p>
                        </div>
                        <div className={`p-3 rounded-lg border-2 ${roundUpInstallments && !temValoresCustom ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white'}`}>
                          <p className="text-xs text-gray-500 uppercase">Arredondado</p>
                          <p className="font-bold text-lg text-gray-800">{installments - 1}× R$ {parcelaArredondada.toFixed(2)}</p>
                          <p className="text-xs text-green-600">+ 1× R$ {ultimaParcela.toFixed(2)}</p>
                        </div>
                      </div>
                      
                      {temValoresCustom && (
                        <div className="mb-3 p-2 bg-yellow-50 border border-yellow-300 rounded-lg text-xs text-yellow-800 flex items-center gap-2">
                          <span>✏️</span>
                          <span>Valores personalizados ativos - clique em "Resetar" para voltar ao cálculo automático</span>
                        </div>
                      )}
                      
                      {/* Tabela de Parcelas Editável */}
                      <div className="bg-white rounded-lg border overflow-hidden">
                        <div className="bg-gray-100 px-3 py-2 border-b flex justify-between items-center">
                          <p className="text-sm font-semibold text-gray-700">📅 Cronograma de Pagamentos</p>
                          <p className="text-xs text-gray-500">Clique no valor para editar</p>
                        </div>
                        <div className="max-h-64 overflow-y-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50 sticky top-0">
                              <tr>
                                <th className="text-left p-2 border-b">Parcela</th>
                                <th className="text-left p-2 border-b">Vencimento</th>
                                <th className="text-right p-2 border-b">Valor (editável)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Array.from({ length: installments }, (_, i) => {
                                const vencimento = new Date(year, month - 1 + i, 1);
                                const valor = getValorParcela(i);
                                const isCustom = temValoresCustom && customInstallmentValues[i] !== (roundUpInstallments ? (i === installments - 1 ? ultimaParcela : parcelaArredondada) : parcelaExata);
                                
                                return (
                                  <tr key={i} className={isCustom ? 'bg-yellow-50' : (i === installments - 1 && roundUpInstallments && !temValoresCustom ? 'bg-green-50' : '')}>
                                    <td className="p-2 border-b">
                                      <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-semibold">
                                        {i + 1}/{installments}
                                      </span>
                                    </td>
                                    <td className="p-2 border-b text-gray-600">
                                      {meses[vencimento.getMonth()]}/{vencimento.getFullYear()}
                                    </td>
                                    <td className="p-2 border-b text-right">
                                      <div className="flex items-center justify-end gap-1">
                                        <span className="text-gray-500">R$</span>
                                        <input
                                          type="number"
                                          step="0.01"
                                          min="0"
                                          className={`w-24 p-1 border-2 rounded text-right font-mono font-semibold transition ${isCustom ? 'border-yellow-400 bg-yellow-50' : 'border-gray-300'} hover:border-blue-400 focus:border-blue-500 focus:outline-none`}
                                          value={valor.toFixed(2)}
                                          onChange={(e) => handleEditParcela(i, parseFloat(e.target.value) || 0)}
                                          title={`Editar valor da parcela ${i + 1} - altera o total final`}
                                        />
                                        {isCustom && <span className="text-yellow-600" title="Valor personalizado">✏️</span>}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                            <tfoot className="bg-gradient-to-r from-green-100 to-emerald-100">
                              <tr>
                                <td className="p-3 font-bold text-gray-700" colSpan={2}>
                                  <div className="flex items-center gap-2">
                                    <span>💰 TOTAL FINAL</span>
                                    {temValoresCustom && Math.abs(valorFinal - valorBase) > 0.01 && (
                                      <span className={`text-xs px-2 py-1 rounded ${valorFinal > valorBase ? 'bg-green-200 text-green-700' : 'bg-red-200 text-red-700'}`}>
                                        {valorFinal > valorBase ? '+' : ''}{(valorFinal - valorBase).toFixed(2)}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="p-3 text-right">
                                  <span className="text-2xl font-bold text-green-600">
                                    R$ {valorFinal.toFixed(2)}
                                  </span>
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                      
                      {/* Dica de uso */}
                      <p className="text-xs text-gray-500 mt-3 text-center">
                        💡 Edite cada parcela individualmente. O valor total será recalculado automaticamente.
                      </p>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
      </div>
      
      {/* ========================================= */}
      {/* SEÇÃO FINAL: Opções de Envio e Registro  */}
      {/* ========================================= */}
      {saleItems.length > 0 && (
        <div className="space-y-4">
          {/* Enviar Carnê pelo WhatsApp */}
          {installments > 1 && (
            <div className="p-4 bg-green-50 border-2 border-green-300 rounded-xl">
              <label className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={sendCard} 
                  onChange={(e) => setSendCard(e.target.checked)}
                  className="w-6 h-6 accent-green-600"
                />
                <div>
                  <span className="font-semibold text-green-800 text-lg">📱 Enviar carnê de parcelas pelo WhatsApp</span>
                  <p className="text-sm text-green-600 mt-1">
                    O carnê será enviado para o cliente automaticamente após registrar
                  </p>
                </div>
              </label>
            </div>
          )}

          {/* Foto da Peça */}
          <div className="p-4 bg-gray-50 border-2 border-gray-300 rounded-xl">
            <label className="block font-bold text-gray-800 mb-3">📸 Foto da Peça (opcional)</label>
            <input 
              type="file" 
              accept="image/*" 
              className="w-full p-3 border-2 border-gray-300 rounded-lg bg-white" 
              onChange={handlePhotoCapture} 
              title="Selecione uma foto da peça" 
            />
            {photo && (
              <div className="mt-3 flex items-center gap-3">
                <img src={photo} className="max-w-xs rounded-lg border-2 border-gray-300" alt="Preview" />
                <button 
                  onClick={() => setPhoto('')}
                  className="bg-red-500 text-white px-3 py-2 rounded-lg hover:bg-red-600"
                >
                  🗑️ Remover
                </button>
              </div>
            )}
          </div>

          {/* Botão de Registrar Venda */}
          <button 
            onClick={handleSubmit} 
            className="w-full bg-gradient-to-r from-purple-600 to-blue-500 text-white p-5 rounded-xl font-bold text-xl hover:shadow-2xl hover:scale-[1.02] transition-all flex items-center justify-center gap-3"
          >
            <span className="text-2xl">💾</span>
            Registrar Venda
          </button>
        </div>
      )}
    </div>
  );
}

function DespesasPage({ token }: { token: string }) {
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [expenses, setExpenses] = useState<any[]>([]);

  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = async () => {
    const res = await fetch('/api/expenses', {
      headers: { Authorization: `Bearer ${token}` }
    });
    setExpenses(await res.json());
  };

  const handleSubmit = async () => {
    if (!description || !amount) {
      alert('Preencha descrição e valor');
      return;
    }

    const res = await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        description,
        category,
        amount: parseFloat(amount),
        date,
        paid: true
      })
    });

    if (res.ok) {
      alert('Despesa registrada!');
      setDescription('');
      setCategory('');
      setAmount('');
      loadExpenses();
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">💸 Registrar Despesa</h2>
        
        <div className="mb-4">
          <label className="block font-semibold mb-2">Descrição</label>
          <input type="text" className="w-full p-3 border rounded-lg" placeholder="Ex: Aluguel, Luz, Matéria-prima" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div className="mb-4">
          <label className="block font-semibold mb-2">Categoria</label>
          <input type="text" className="w-full p-3 border rounded-lg" placeholder="Ex: Fixo, Variável" value={category} onChange={(e) => setCategory(e.target.value)} />
        </div>

        <div className="mb-4">
          <label className="block font-semibold mb-2">Valor (R$)</label>
          <input type="number" className="w-full p-3 border rounded-lg" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>

        <div className="mb-4">
          <label className="block font-semibold mb-2">Data</label>
          <input type="date" className="w-full p-3 border rounded-lg" value={date} onChange={(e) => setDate(e.target.value)} title="Data da despesa" />
        </div>

        <button onClick={handleSubmit} className="w-full bg-red-600 text-white p-4 rounded-lg font-bold text-lg hover:bg-red-700 transition">
          💾 Registrar Despesa
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">📋 Histórico de Despesas</h2>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {expenses.map((expense: any) => (
            <div key={expense.id} className="border-l-4 border-red-600 pl-4 py-2 bg-red-50 rounded">
              <p className="font-semibold text-gray-800">{expense.description}</p>
              {expense.category && <p className="text-sm text-gray-600">{expense.category}</p>}
              <div className="flex justify-between items-center mt-1">
                <span className="text-red-600 font-bold">{formatCurrency(expense.amount)}</span>
                <span className="text-xs text-gray-500">{formatDate(expense.date)}</span>
              </div>
            </div>
          ))}
          {expenses.length === 0 && (
            <p className="text-gray-400 text-center py-8">Nenhuma despesa registrada</p>
          )}
        </div>
      </div>
    </div>
  );
}

function MostruarioPage({ token }: { token: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [photo, setPhoto] = useState('');
  const [itemName, setItemName] = useState('');
  const [itemCode, setItemCode] = useState('');
  const [factor, setFactor] = useState('');
  const [baseValue, setBaseValue] = useState('');
  const [priceManual, setPriceManual] = useState('');
  const [description, setDescription] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [installmentsPreview, setInstallmentsPreview] = useState(1);
  const [roundUpPreview, setRoundUpPreview] = useState(true);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      const res = await fetch('/api/showcase', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Erro ao carregar mostruário:', error);
    }
  };

  const calculatePrice = () => {
    // Se tiver preço manual, usa ele
    if (priceManual && parseFloat(priceManual) > 0) {
      return priceManual;
    }
    // Se não, calcula pelo fator (se tiver)
    const f = parseFloat(factor);
    if (!isNaN(f) && f > 0 && priceManual) {
      return priceManual;
    }
    return priceManual || '0.00';
  };

  const handleSubmit = async () => {
    if (!photo || !itemName || !factor) {
      alert('Preencha foto, nome e fator');
      return;
    }

    try {
      const res = await fetch('/api/showcase', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          itemName,
          itemCode: itemCode || null,
          factor: parseFloat(factor),
          baseValue: null,
          price: null,
          description: description || null,
          imageBase64: photo
        })
      });

      if (res.ok) {
        alert('✓ Item adicionado ao mostruário!');
        setPhoto('');
        setItemName('');
        setItemCode('');
        setFactor('');
        setBaseValue('');
        setPriceManual('');
        setDescription('');
        setInstallmentsPreview(1);
        setShowForm(false);
        loadItems();
      } else {
        alert('Erro ao adicionar item');
      }
    } catch (error) {
      alert('Erro: ' + error);
    }
  };

  const handleEditItem = (item: any) => {
    setEditingItemId(item.id);
    setItemName(item.itemName);
    setItemCode(item.itemCode || '');
    setFactor(String(item.factor || ''));
    setBaseValue(String(item.baseValue || ''));
    setPriceManual(String(item.price || ''));
    setDescription(item.description || '');
    setPhoto(item.imageUrl || '');
    setInstallmentsPreview(1);
    setShowForm(true);
  };

  const handleUpdateItem = async () => {
    if (!itemName || !factor) {
      alert('Preencha nome e fator');
      return;
    }

    try {
      const body: any = {
        itemName,
        itemCode: itemCode || null,
        factor: parseFloat(factor),
        baseValue: null,
        price: null,
        description: description || null
      };

      // Se houver uma nova foto (em base64), enviar
      if (photo && photo.startsWith('data:')) {
        body.imageBase64 = photo;
      }

      const res = await fetch(`/api/showcase/${editingItemId}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        alert('✓ Item atualizado!');
        setEditingItemId(null);
        setPhoto('');
        setItemName('');
        setItemCode('');
        setFactor('');
        setBaseValue('');
        setPriceManual('');
        setDescription('');
        setInstallmentsPreview(1);
        setShowForm(false);
        loadItems();
      } else {
        alert('Erro ao atualizar item');
      }
    } catch (error) {
      alert('Erro: ' + error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Deseja remover este item do mostruário?')) return;
    
    try {
      const res = await fetch(`/api/showcase/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        // Limpar estado de edição se estava editando este item
        if (editingItemId === id) {
          setEditingItemId(null);
          setShowForm(false);
          setShowImageEditor(false);
          setPhoto('');
        }
        loadItems();
      }
    } catch (error) {
      console.error('Erro ao deletar:', error);
    }
  };

  const handleToggleSold = async (id: number, sold: boolean) => {
    try {
      const res = await fetch(`/api/showcase/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ sold: !sold })
      });
      if (res.ok) {
        loadItems();
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
    }
  };

  const handleChangeImage = (id: number) => {
    setEditingItemId(id);
    setShowImageEditor(true);
  };

  const handleSaveEditedImage = async (base64: string) => {
    if (!editingItemId) return;
    try {
      // Encontrar item para recalcular preço (usar server também recalcula se necessário)
      const item = items.find((it) => it.id === editingItemId);
      const body: any = {
        imageBase64: base64,
        factor: item?.factor,
        baseValue: item?.baseValue,
        price: item?.price
      };
      const res = await fetch(`/api/showcase/${editingItemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        setEditingItemId(null);
        setShowImageEditor(false);
        loadItems();
      } else {
        alert('Erro ao atualizar imagem');
      }
    } catch (error) {
      alert('Erro: ' + error);
    }
  };

  const handleDeleteImage = async (id: number) => {
    if (!confirm('Remover apenas a imagem desta peça?')) return;
    try {
      const res = await fetch(`/api/showcase/${id}/image`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        loadItems();
      }
    } catch (error) {
      console.error('Erro ao remover imagem:', error);
    }
  };

  const shareWhatsApp = async (item: any, phone?: string, numParcelas?: number) => {
    console.log('shareWhatsApp chamado para item:', item);

    // Montar mensagem com link da imagem para gerar miniatura automática
    let text = `💎 VANI E ELO JOIAS\n`;
    text += `━━━━━━━━━━━━━━━━━━━━\n`;
    text += `${item.itemName || ''}\n\n`;
    
    // Mostrar fator se disponível (novo formato)
    if (item.factor) {
      text += `🔢 Fator: ${item.factor}\n`;
    }
    
    text += `\n━━━━━━━━━━━━━━━━━━━━`;

    if (item.imageUrl) {
      const imageUrl = item.imageUrl.startsWith('http') ? item.imageUrl : `${window.location.origin}${item.imageUrl}`;
      text += `\n\n${imageUrl}`;
    }

    const encodedText = encodeURIComponent(text);

    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');
    const cleanPhone = phone ? phone.replace(/\D/g, '') : '';

    if (isMobile) {
      // Mobile: usar wa.me para abrir app do WhatsApp
      if (cleanPhone) {
        window.location.href = `https://wa.me/55${cleanPhone}?text=${encodedText}`;
      } else {
        window.location.href = `https://wa.me/?text=${encodedText}`;
      }
    } else {
      // Desktop: usar WhatsApp Web
      if (cleanPhone) {
        window.open(`https://web.whatsapp.com/send?phone=55${cleanPhone}&text=${encodedText}`, '_blank');
      } else {
        window.open(`https://web.whatsapp.com/send?text=${encodedText}`, '_blank');
      }
    }
  };

  const shareToContact = async (item: any) => {
    const phone = prompt('Digite o número do WhatsApp (com DDD):');
    if (phone) {
      await shareWhatsApp(item, phone);
    }
  };

  const formatCurrency = (value: any) => {
    const num = typeof value === 'number' ? value : parseFloat(value || '0');
    if (isNaN(num)) return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(0);
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">💎 Mostruário de Joias</h2>
            <p className="text-gray-600 text-sm mt-1">Cadastre peças e compartilhe por WhatsApp</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition flex items-center gap-2"
          >
            {showForm ? '✖ Cancelar' : '➕ Nova Peça'}
          </button>
        </div>
      </div>

      {/* Formulário */}
      {showForm && !showImageEditor && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">
            {editingItemId ? '✏️ Editar Peça' : '📸 Cadastrar Nova Peça'}
          </h3>
          
          {/* Foto Preview ou Botão */}
          <div className="mb-4">
            {!photo ? (
              <button
                onClick={() => setShowImageEditor(true)}
                className="w-full p-6 border-2 border-dashed border-purple-500 rounded-lg hover:bg-purple-50 transition flex flex-col items-center gap-2"
              >
                <span className="text-4xl">📷</span>
                <span className="font-semibold text-purple-600">Clique para adicionar foto</span>
              </button>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="font-semibold">📷 Foto da Peça (com preço)</label>
                  <button
                    onClick={() => {
                      setPhoto('');
                      setShowImageEditor(true);
                    }}
                    className="text-blue-600 hover:text-blue-800 font-semibold"
                  >
                    ✏️ Editar Foto
                  </button>
                </div>
                <img src={photo} alt="Preview" className="max-w-xs rounded-lg shadow-md" />
                <p className="text-sm text-gray-600">
                  💡 A faixa com o preço será adicionada automaticamente ao salvar
                </p>
              </div>
            )}
          </div>

          {/* Nome e Código */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block font-semibold mb-2" htmlFor="showcase-item-name">💍 Nome da Peça</label>
              <input
                id="showcase-item-name"
                type="text"
                placeholder="Ex: Anel de Ouro 18k"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                className="w-full p-3 border rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold mb-2" htmlFor="showcase-item-code">📦 Código (opcional)</label>
              <input
                id="showcase-item-code"
                type="text"
                placeholder="Ex: AN-123"
                value={itemCode}
                onChange={(e) => setItemCode(e.target.value)}
                className="w-full p-3 border rounded-lg"
              />
            </div>
          </div>

          {/* Fator */}
          <div className="mb-4 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-xl">
            <h4 className="font-bold text-gray-800 mb-3">🔢 Fator</h4>
            <div>
              <label className="block text-sm font-semibold mb-1" htmlFor="showcase-factor">Fator da Peça</label>
              <input
                id="showcase-factor"
                type="number"
                step="0.01"
                placeholder="Ex: 2.5"
                value={factor}
                onChange={(e) => setFactor(e.target.value)}
                className="w-full p-3 border-2 border-yellow-400 rounded-lg text-xl font-bold text-yellow-700"
              />
              <p className="text-xs text-gray-500 mt-1">Este fator será exibido na tarja da imagem</p>
            </div>
          </div>

          {/* Descrição */}
          <div className="mb-4">
            <label className="block font-semibold mb-2" htmlFor="showcase-description">📝 Descrição (opcional)</label>
            <textarea
              id="showcase-description"
              placeholder="Detalhes sobre a peça..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 border rounded-lg h-24"
            />
          </div>

          {/* Botões */}
          <div className="flex gap-3">
            <button
              onClick={editingItemId ? handleUpdateItem : handleSubmit}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white p-3 rounded-lg font-semibold transition"
            >
              {editingItemId ? '✓ Atualizar Peça' : '✓ Salvar no Mostruário'}
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                setEditingItemId(null);
                setPhoto('');
                setItemName('');
                setItemCode('');
                setFactor('');
                setBaseValue('');
                setPriceManual('');
                setDescription('');
                setInstallmentsPreview(1);
              }}
              className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-6 py-3 rounded-lg font-semibold transition"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Editor de Imagem */}
      {showImageEditor && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">✂️ Editar Imagem</h3>
          <ImageEditor
            onImageReady={(base64) => {
              if (editingItemId) {
                // Edição de imagem de item existente
                handleSaveEditedImage(base64);
              } else {
                // Nova peça
                setPhoto(base64);
                setShowImageEditor(false);
              }
            }}
            onCancel={() => {
              setEditingItemId(null);
              setShowImageEditor(false);
            }}
          />
        </div>
      )}

      {/* Grid de Itens */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((item) => (
          <div key={item.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition relative">
            {/* Imagem */}
            {item.imageUrl && (
              <div className="relative h-64 bg-gray-100 cursor-pointer" onClick={() => { console.log('Imagem clicada, abrindo modal'); setSelectedImage(item.imageUrl); }}>
                <img
                  src={item.imageUrl}
                  alt={item.itemName}
                  className="w-full h-full object-cover"
                />
                {/* Tarja com Fator */}
                {item.factor && (
                  <div className="absolute top-3 right-3 bg-yellow-500 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg">
                    Fator: {item.factor}
                  </div>
                )}
                {item.sold && (
                  <div className="absolute top-3 left-3 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow">
                    VENDIDA
                  </div>
                )}
              </div>
            )}
            
            {/* Informações */}
            <div className="p-4">
              <h3 
                className="font-bold text-lg text-gray-800 mb-1 cursor-pointer hover:text-purple-600 transition"
                onClick={() => { console.log('Título clicado, abrindo modal'); item.imageUrl && setSelectedImage(item.imageUrl); }}
              >
                {item.itemName}
              </h3>
              {item.itemCode && (
                <p className="text-sm text-gray-500 mb-2">📦 {item.itemCode}</p>
              )}
              {item.description && (
                <p className="text-sm text-gray-600 mb-3">{item.description}</p>
              )}
              
              {/* Exibe fator em destaque */}
              {item.factor && (
                <div className="bg-yellow-50 p-3 rounded-lg mb-3 border-2 border-yellow-300">
                  <p className="text-lg font-bold text-yellow-700">🔢 Fator: {item.factor}</p>
                </div>
              )}

              {/* Botões de Ação */}
              <div className="flex gap-2">
                <button
                  onClick={() => shareWhatsApp(item)}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 px-3 rounded-lg text-sm font-semibold transition flex items-center justify-center gap-1"
                >
                  <span>📱</span> Abrir WhatsApp
                </button>
                <button
                  onClick={() => shareToContact(item)}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-3 rounded-lg text-sm font-semibold transition flex items-center justify-center gap-1"
                >
                  <span>👤</span> Enviar para
                </button>
              </div>

              {/* Botão para Baixar Imagem */}
              {item.imageUrl && (
                <button
                  onClick={() => {
                    const imageUrl = item.imageUrl.startsWith('http') ? item.imageUrl : `${window.location.origin}${item.imageUrl}`;
                    const link = document.createElement('a');
                    link.href = imageUrl;
                    link.download = `${item.itemName.replace(/\s+/g, '-')}.jpg`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="w-full mt-2 bg-yellow-500 hover:bg-yellow-600 text-white py-2 rounded-lg text-sm font-semibold transition"
                >
                  ⬇️ Baixar Imagem
                </button>
              )}

              {/* Botão de Editar */}
              <button
                onClick={() => handleEditItem(item)}
                className="w-full mt-2 bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg text-sm font-semibold transition"
              >
                ✏️ Editar
              </button>

              {/* Controles de Imagem */}
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => handleChangeImage(item.id)}
                  className="flex-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 py-2 rounded-lg text-sm font-semibold transition"
                >
                  ✏️ Trocar Foto
                </button>
                {item.imageUrl && (
                  <button
                    onClick={() => handleDeleteImage(item.id)}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg text-sm font-semibold transition"
                  >
                    🗂️ Remover Foto
                  </button>
                )}
              </div>

              {/* Vender/Disponibilizar */}
              <button
                onClick={() => handleToggleSold(item.id, item.sold)}
                className={`w-full mt-2 ${item.sold ? 'bg-red-600 hover:bg-red-700' : 'bg-purple-600 hover:bg-purple-700'} text-white py-2 rounded-lg text-sm font-semibold transition`}
              >
                {item.sold ? '↩️ Marcar como Disponível' : '✅ Marcar como Vendida'}
              </button>
              
              <button
                onClick={() => handleDelete(item.id)}
                className="w-full mt-2 bg-red-100 hover:bg-red-200 text-red-600 py-2 rounded-lg text-sm font-semibold transition"
              >
                🗑️ Remover
              </button>
            </div>
          </div>
        ))}
      </div>

      {items.length === 0 && !showForm && (
        <div className="bg-white rounded-xl shadow-lg p-12 text-center">
          <div className="text-6xl mb-4">💎</div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">Mostruário Vazio</h3>
          <p className="text-gray-600 mb-4">Cadastre suas joias para compartilhar com clientes via WhatsApp</p>
          <button
            onClick={() => setShowForm(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition"
          >
            ➕ Adicionar Primeira Peça
          </button>
        </div>
      )}

      {/* Modal de Imagem */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-screen">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 bg-white rounded-full w-10 h-10 flex items-center justify-center text-gray-800 hover:bg-gray-200 transition z-10 shadow-lg"
            >
              ✕
            </button>
            <img
              src={selectedImage}
              alt="Visualização"
              className="max-w-full max-h-screen object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ClientesPage({ token, clients, clientSearch, handleClientSearch, handleImportClients, openClientModal, handleDeleteAllClients, onCreateClient }: { token: string, clients: any[], clientSearch: string, handleClientSearch: any, handleImportClients: any, openClientModal: (id: number) => void, handleDeleteAllClients: any, onCreateClient: () => void }) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [visibleCount, setVisibleCount] = useState(18);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">👥 Gerenciar Clientes</h2>
        <div className="flex gap-2">
          <button
            onClick={onCreateClient}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition font-semibold"
          >
            ➕ Criar Cliente
          </button>
          <label className="bg-blue-600 text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-blue-700 transition">
            📥 Importar Contatos
            <input 
              type="file" 
              accept=".csv,.json,.txt,.vcf" 
              onChange={handleImportClients}
              className="hidden"
            />
          </label>
          {clients.length > 0 && (
            <button
              onClick={handleDeleteAllClients}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
              title="Apagar todos os clientes"
            >
              🗑️ Limpar Tudo
            </button>
          )}
        </div>
      </div>

      <div className="mb-6 relative">
        <div className="flex gap-4 items-center">
          <div className="flex-1 relative">
            <input 
              type="text" 
              placeholder="🔍 Buscar por nome ou telefone..." 
              className="w-full p-3 border rounded-lg"
              value={clientSearch}
              onChange={(e) => {
                handleClientSearch(e);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              autoComplete="off"
            />
            {showSuggestions && clientSearch && (
              <div className="absolute z-20 mt-1 w-full max-h-60 overflow-y-auto bg-white border-2 border-purple-200 rounded-lg shadow-xl">
                <div className="sticky top-0 bg-purple-50 px-3 py-2 border-b border-purple-100 text-xs text-purple-700 font-semibold">
                  {clients.length} cliente(s) encontrado(s)
                </div>
                {clients.slice(0, 10).map((client: any) => (
                  <button
                    key={client.id}
                    onClick={() => {
                      setShowSuggestions(false);
                      openClientModal(client.id);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-purple-50 border-b last:border-b-0 transition"
                  >
                    <p className="font-semibold text-gray-800">{client.name}</p>
                    <p className="text-xs text-gray-600">{client.phone}</p>
                  </button>
                ))}
                {clients.length > 10 && (
                  <div className="px-3 py-2 text-xs text-gray-500 bg-gray-50 text-center">
                    + {clients.length - 10} cliente(s) a mais... continue digitando para refinar
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="bg-purple-100 px-4 py-3 rounded-lg">
            <p className="text-sm text-gray-600">Total de Clientes</p>
            <p className="text-2xl font-bold text-purple-600">{clients.length}</p>
          </div>
        </div>
      </div>

      {/* Info de Importação */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-800 font-semibold">💡 Como importar contatos:</p>
        <p className="text-sm text-blue-700 mt-2">
          Você pode importar contatos em formato <strong>CSV</strong>, <strong>JSON</strong>, <strong>vCard (.vcf)</strong> ou do <strong>WhatsApp</strong>.
        </p>
        <p className="text-xs text-blue-600 mt-2">
          <strong>Formatos aceitos:</strong><br/>
          • CSV: nome,telefone,email<br/>
          • JSON: [{'{'}name: João, phone: +5511999999999{'}'}]<br/>
          • vCard (.vcf): padrão iCloud/contatos (FN, TEL)<br/>
          • WhatsApp: Contact,Phone (exportar direto do app)
        </p>
      </div>

      {/* Lista de Clientes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clients.length > 0 ? (
          clients.slice(0, visibleCount).map((client: any) => (
            <div 
              key={client.id} 
              className="border-2 border-gray-200 rounded-lg p-4 hover:border-purple-400 hover:shadow-lg transition cursor-pointer"
              onClick={() => openClientModal(client.id)}
            >
              <p className="font-bold text-lg text-gray-800">{client.name}</p>
              <p className="text-sm text-gray-600 mt-1">📱 {client.phone || 'Sem telefone'}</p>
              {client.email && <p className="text-sm text-gray-600">📧 {client.email}</p>}
              {client.createdAt && <p className="text-xs text-gray-500 mt-2">Adicionado em {formatDate(client.createdAt)}</p>}
              <p className="text-xs text-purple-600 mt-2 hover:underline">👆 Clique para ver carnê</p>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <p className="text-gray-400 text-lg">Nenhum cliente encontrado</p>
            <p className="text-gray-500 text-sm mt-2">Importe contatos do WhatsApp para começar</p>
          </div>
        )}
      </div>
      
      {/* Botão Carregar Mais */}
      {clients.length > visibleCount && (
        <div className="mt-6 text-center">
          <button
            onClick={() => setVisibleCount(prev => prev + 10)}
            className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition font-semibold"
          >
            ➕ Carregar mais 10 clientes ({clients.length - visibleCount} restantes)
          </button>
        </div>
      )}
    </div>
  );
}

function HistoricoPage({ token, openClientModal }: { token: string, openClientModal: (id: number) => void }) {
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [sales, setSales] = useState<any[]>([]);
  const [allSales, setAllSales] = useState<any[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState<any>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [editingPaymentDate, setEditingPaymentDate] = useState<any>(null);
  const [newPaymentDate, setNewPaymentDate] = useState('');
  const [sortOrder, setSortOrder] = useState<'recent' | 'oldest'>('recent');
  const [clientSortOrder, setClientSortOrder] = useState<'recent' | 'oldest'>('recent');
  const [editingSale, setEditingSale] = useState<any>(null);
  const [editSaleForm, setEditSaleForm] = useState({ itemName: '', itemCode: '', totalValue: '', sellerName: '', observations: '', isExchange: false });
  const [editInstallments, setEditInstallments] = useState<{id: number, amount: number, dueDate: string, paid: boolean, sequence: number}[]>([]);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  
  // Estados de renegociação
  const [showRenegotiate, setShowRenegotiate] = useState(false);
  const [renegotiateForm, setRenegotiateForm] = useState({ totalValue: '', installments: '1', startDate: '' });
  const [isRenegotiating, setIsRenegotiating] = useState(false);

  // Populate edit form when editingSale changes
  useEffect(() => {
    if (editingSale) {
      setEditSaleForm({
        itemName: editingSale.itemName || '',
        itemCode: editingSale.itemCode || '',
        totalValue: String(editingSale.totalValue || ''),
        sellerName: editingSale.sellerName || '',
        observations: editingSale.observations || '',
        isExchange: editingSale.isExchange || false
      });
      if (editingSale.installmentsR) {
        setEditInstallments(editingSale.installmentsR.map((inst: any) => ({
          id: inst.id,
          amount: inst.amount,
          dueDate: inst.dueDate.split('T')[0],
          paid: inst.paid,
          sequence: inst.sequence
        })));
      }
    }
  }, [editingSale]);

  const handleSaveEditSale = async () => {
    if (!editingSale) return;
    setIsSavingEdit(true);
    try {
      const res = await fetch(`/api/sales/${editingSale.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          itemName: editSaleForm.itemName,
          itemCode: editSaleForm.itemCode,
          totalValue: parseFloat(editSaleForm.totalValue),
          sellerName: editSaleForm.sellerName,
          observations: editSaleForm.observations,
          isExchange: editSaleForm.isExchange
        })
      });
      if (!res.ok) throw new Error('Erro ao salvar');
      
      // Save installments
      for (const inst of editInstallments) {
        if (!inst.paid) {
          await fetch(`/api/installments/${inst.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ amount: inst.amount, dueDate: inst.dueDate })
          });
        }
      }
      
      await loadClientSales(selectedClient.id);
      await loadAllSales();
      setEditingSale(null);
    } catch (error) {
      console.error('Erro ao salvar venda:', error);
      alert('Erro ao salvar alterações');
    } finally {
      setIsSavingEdit(false);
    }
  };
  
  // Função de renegociação
  const handleRenegotiate = async () => {
    if (!editingSale) return;
    
    const totalValue = parseFloat(renegotiateForm.totalValue);
    const installments = parseInt(renegotiateForm.installments);
    
    if (!totalValue || totalValue <= 0 || !installments || installments < 1 || !renegotiateForm.startDate) {
      alert('Preencha todos os campos corretamente');
      return;
    }
    
    setIsRenegotiating(true);
    try {
      const res = await fetch(`/api/sales/${editingSale.id}/renegotiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          totalValue,
          newInstallments: installments,
          startDate: renegotiateForm.startDate
        })
      });
      
      if (!res.ok) {
        throw new Error('Erro ao renegociar');
      }
      
      alert('✅ Renegociação realizada com sucesso!');
      setShowRenegotiate(false);
      setRenegotiateForm({ totalValue: '', installments: '1', startDate: '' });
      setEditingSale(null);
      await loadClientSales(selectedClient.id);
      await loadAllSales();
    } catch (error) {
      console.error('Erro ao renegociar:', error);
      alert('❌ Erro ao renegociar venda');
    } finally {
      setIsRenegotiating(false);
    }
  };

  const filteredClients = useMemo(() => {
    let filtered = clientSearch.trim() ? clients.filter(c => {
      const term = clientSearch.toLowerCase();
      return c.name?.toLowerCase().includes(term) || c.phone?.toLowerCase().includes(term);
    }) : clients;

    // Ordenar clientes por data da venda mais recente
    const sorted = [...filtered].sort((a, b) => {
      const salesA = allSales.filter(s => s.clientId === a.id);
      const salesB = allSales.filter(s => s.clientId === b.id);
      
      if (salesA.length === 0 && salesB.length === 0) return 0;
      if (salesA.length === 0) return 1;
      if (salesB.length === 0) return -1;
      
      const latestA = Math.max(...salesA.map(s => new Date(s.saleDate).getTime()));
      const latestB = Math.max(...salesB.map(s => new Date(s.saleDate).getTime()));
      
      return clientSortOrder === 'recent' ? latestB - latestA : latestA - latestB;
    });

    return sorted;
  }, [clients, clientSearch, allSales, clientSortOrder]);

  const sortedSales = useMemo(() => {
    const sorted = [...sales];
    sorted.sort((a, b) => {
      const dateA = new Date(a.saleDate).getTime();
      const dateB = new Date(b.saleDate).getTime();
      return sortOrder === 'recent' ? dateB - dateA : dateA - dateB;
    });
    return sorted;
  }, [sales, sortOrder]);

  useEffect(() => {
    loadClients();
    loadAllSales();
  }, []);

  const loadClients = async () => {
    const res = await fetch('/api/clients', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setClients(data);
  };

  const loadAllSales = async () => {
    const res = await fetch('/api/sales', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setAllSales(data);
  };

  const loadClientSales = async (clientId: number) => {
    const res = await fetch(`/api/clients/${clientId}/sales`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setSales(data);
    const client = clients.find(c => c.id === clientId);
    setSelectedClient(client);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const getTotalPaid = (installments: any[]) => {
    return installments.filter(i => i.paid).reduce((sum, i) => sum + i.amount, 0);
  };

  const getTotalPending = (installments: any[]) => {
    return installments.filter(i => !i.paid).reduce((sum, i) => sum + i.amount, 0);
  };

  const handleDeleteClick = (sale: any) => {
    setSaleToDelete(sale);
    setDeleteReason('');
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteReason.trim()) {
      alert('O motivo é obrigatório!');
      return;
    }

    try {
      const res = await fetch(`/api/sales/${saleToDelete.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reason: deleteReason,
          deletedBy: 'Usuário'
        })
      });

      if (res.ok) {
        // Atualizar listas
        await loadAllSales();
        if (selectedClient) {
          await loadClientSales(selectedClient.id);
        }
        setShowDeleteModal(false);
        setSaleToDelete(null);
        setDeleteReason('');
        alert('Venda excluída com sucesso!');
      } else {
        const error = await res.json();
        alert(`Erro ao excluir venda: ${error.error || 'Erro desconhecido'}`);
      }
    } catch (error) {
      console.error('Erro ao excluir venda:', error);
      alert('Erro ao excluir venda');
    }
  };

  const handleUpdatePaymentDate = async () => {
    if (!newPaymentDate) {
      alert('Selecione uma data válida!');
      return;
    }

    try {
      const res = await fetch(`/api/sales/${editingPaymentDate.id}/update-payment-date`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          firstPaymentDate: newPaymentDate
        })
      });

      if (res.ok) {
        await loadAllSales();
        if (selectedClient) {
          await loadClientSales(selectedClient.id);
        }
        setEditingPaymentDate(null);
        setNewPaymentDate('');
        alert('Data de pagamento atualizada com sucesso!');
      } else {
        const error = await res.json();
        alert(`Erro ao atualizar: ${error.error || 'Erro desconhecido'}`);
      }
    } catch (error) {
      console.error('Erro ao atualizar data:', error);
      alert('Erro ao atualizar data de pagamento');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Lista de Clientes */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">👥 Clientes</h2>
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Buscar cliente</label>
          <input
            type="text"
            list="clientSuggestions"
            value={clientSearch}
            onChange={(e) => {
              const value = e.target.value;
              setClientSearch(value);
              const match = clients.find(c => c.name?.toLowerCase() === value.toLowerCase());
              if (match) {
                loadClientSales(match.id);
              }
            }}
            placeholder="Nome ou telefone"
            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-purple-600 focus:outline-none"
          />
          <datalist id="clientSuggestions">
            {clients.map((c) => (
              <option key={c.id} value={c.name} />
            ))}
          </datalist>
        </div>
        
        {/* Botões de Ordenação de Clientes */}
        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setClientSortOrder('recent')}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition ${
              clientSortOrder === 'recent'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            🔽 Mais Recentes
          </button>
          <button
            onClick={() => setClientSortOrder('oldest')}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition ${
              clientSortOrder === 'oldest'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            🔼 Mais Antigas
          </button>
        </div>
        
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredClients.map((client: any) => {
            const clientSales = allSales.filter(s => s.clientId === client.id);
            const totalVendido = clientSales.reduce((sum, s) => sum + s.totalValue, 0);
            
            return (
              <button
                key={client.id}
                onClick={() => loadClientSales(client.id)}
                onDoubleClick={() => openClientModal(client.id)}
                className={`w-full text-left p-4 rounded-lg border-2 transition ${
                  selectedClient?.id === client.id
                    ? 'border-purple-600 bg-purple-50'
                    : 'border-gray-200 hover:border-purple-300'
                }`}
                title="Clique duplo para ver carnê"
              >
                <p className="font-semibold text-gray-800">{client.name}</p>
                <p className="text-sm text-gray-600">{client.phone}</p>
                <div className="mt-2 flex justify-between items-center">
                  <span className="text-xs text-gray-500">{clientSales.length} venda(s)</span>
                  <span className="text-sm font-bold text-green-600">{formatCurrency(totalVendido)}</span>
                </div>
              </button>
            );
          })}
          {clients.length === 0 && (
            <p className="text-gray-400 text-center py-8">Nenhum cliente cadastrado</p>
          )}
        </div>
      </div>

      {/* Histórico de Vendas do Cliente Selecionado */}
      <div className="lg:col-span-2 bg-white rounded-xl shadow-lg p-6">
        {selectedClient ? (
          <>
            <div className="mb-6">
              <div className="flex justify-between items-start flex-wrap gap-4 mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">
                    📜 Histórico de {selectedClient.name}
                  </h2>
                  <p className="text-gray-600">{selectedClient.phone}</p>
                </div>
                
                {/* Botões de Ordenação */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setSortOrder('recent')}
                    className={`px-4 py-2 rounded-lg font-semibold transition ${
                      sortOrder === 'recent'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    🔽 Mais Recentes
                  </button>
                  <button
                    onClick={() => setSortOrder('oldest')}
                    className={`px-4 py-2 rounded-lg font-semibold transition ${
                      sortOrder === 'oldest'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    🔼 Mais Antigas
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {sortedSales.map((sale: any) => {
                const totalPago = getTotalPaid(sale.installmentsR || []);
                const totalPendente = getTotalPending(sale.installmentsR || []);
                const progresso = (totalPago / sale.totalValue) * 100;

                return (
                  <div key={sale.id} className={`border-2 rounded-lg p-4 hover:border-purple-300 transition ${sale.isExchange ? 'border-orange-400 bg-orange-50' : 'border-gray-200'}`}>
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-lg font-bold text-gray-800">{sale.itemName}</h3>
                          {sale.isExchange && (
                            <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                              🔄 TROCA
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{formatDate(sale.saleDate)}</p>
                        {sale.installments > 1 && sale.installmentsR && sale.installmentsR.length > 0 && (
                          <p className="text-xs text-blue-600 mt-1">
                            📅 Primeiro pagamento: {new Date(sale.installmentsR[0].dueDate).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                          </p>
                        )}
                      </div>
                      <div className="text-right flex items-start gap-2">
                        <div>
                          <p className="text-xl font-bold text-green-600">{formatCurrency(sale.totalValue)}</p>
                          <p className="text-xs text-gray-500">{sale.installments}x parcelas</p>
                        </div>
                        {sale.installments > 1 && (
                          <button
                            onClick={() => {
                              setEditingPaymentDate(sale);
                              const firstDue = new Date(sale.installmentsR[0].dueDate);
                              setNewPaymentDate(`${firstDue.getFullYear()}-${String(firstDue.getMonth() + 1).padStart(2, '0')}`);
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded transition"
                            title="Editar data do primeiro pagamento"
                          >
                            📅
                          </button>
                        )}
                        <button
                          onClick={() => setEditingSale(sale)}
                          className="p-2 text-yellow-600 hover:bg-yellow-50 rounded transition"
                          title="Editar venda"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDeleteClick(sale)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded transition"
                          title="Excluir venda"
                        >
                          🗑️
                        </button>
                            {/* Modal de Edição de Venda */}
                            {editingSale && (
                              <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                                <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 relative max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                                  <button
                                    onClick={() => setEditingSale(null)}
                                    className="absolute top-2 right-2 text-2xl text-gray-400 hover:text-gray-700"
                                    title="Fechar"
                                  >×</button>
                                  <h2 className="text-2xl font-bold mb-4 text-purple-700">✏️ Editar Venda</h2>
                                  
                                  <div className="space-y-4">
                                    <div>
                                      <label className="block text-sm font-semibold text-gray-700 mb-1">💎 Nome do Item *</label>
                                      <input
                                        type="text"
                                        value={editSaleForm.itemName}
                                        onChange={e => setEditSaleForm({...editSaleForm, itemName: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                        placeholder="Ex: Anel de Ouro"
                                      />
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">📦 Código</label>
                                        <input
                                          type="text"
                                          value={editSaleForm.itemCode}
                                          onChange={e => setEditSaleForm({...editSaleForm, itemCode: e.target.value})}
                                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                          placeholder="Código do item"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">💰 Valor Total *</label>
                                        <input
                                          type="number"
                                          step="0.01"
                                          value={editSaleForm.totalValue}
                                          onChange={e => setEditSaleForm({...editSaleForm, totalValue: e.target.value})}
                                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                          placeholder="0,00"
                                        />
                                      </div>
                                    </div>
                                    
                                    <div>
                                      <label className="block text-sm font-semibold text-gray-700 mb-1">👤 Vendedor</label>
                                      <input
                                        type="text"
                                        value={editSaleForm.sellerName}
                                        onChange={e => setEditSaleForm({...editSaleForm, sellerName: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                        placeholder="Nome do vendedor"
                                      />
                                    </div>
                                    
                                    <div>
                                      <label className="block text-sm font-semibold text-gray-700 mb-1">📝 Observações</label>
                                      <textarea
                                        value={editSaleForm.observations}
                                        onChange={e => setEditSaleForm({...editSaleForm, observations: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                        rows={2}
                                        placeholder="Observações sobre a venda"
                                      />
                                    </div>
                                    
                                    <div className="flex items-center gap-3 bg-orange-50 p-3 rounded-lg border border-orange-200">
                                      <input
                                        type="checkbox"
                                        id="editIsExchangeHist"
                                        checked={editSaleForm.isExchange}
                                        onChange={e => setEditSaleForm({...editSaleForm, isExchange: e.target.checked})}
                                        className="w-5 h-5 text-orange-500 rounded focus:ring-orange-500"
                                      />
                                      <label htmlFor="editIsExchangeHist" className="text-sm font-semibold text-orange-700 cursor-pointer">
                                        🔄 Esta é uma TROCA
                                      </label>
                                    </div>
                                    
                                    {/* Edição de Parcelas */}
                                    {editInstallments.length > 0 && (
                                      <div className="border-t pt-4 mt-2">
                                        <h4 className="text-sm font-semibold text-gray-700 mb-3">📅 Parcelas</h4>
                                        <div className="space-y-2 max-h-48 overflow-y-auto">
                                          {editInstallments.map((inst, idx) => (
                                            <div key={inst.id} className={`flex items-center gap-2 p-2 rounded-lg ${inst.paid ? 'bg-green-50' : 'bg-gray-50'}`}>
                                              <span className="text-xs font-semibold text-gray-500 w-8">#{inst.sequence}</span>
                                              <input
                                                type="number"
                                                step="0.01"
                                                value={inst.amount}
                                                onChange={e => {
                                                  const updated = [...editInstallments];
                                                  updated[idx] = {...updated[idx], amount: parseFloat(e.target.value) || 0};
                                                  setEditInstallments(updated);
                                                }}
                                                disabled={inst.paid}
                                                className={`flex-1 px-2 py-1 text-sm border rounded ${inst.paid ? 'bg-gray-200 text-gray-500' : 'border-gray-300 focus:ring-2 focus:ring-purple-500'}`}
                                                placeholder="Valor"
                                              />
                                              <input
                                                type="date"
                                                value={inst.dueDate}
                                                onChange={e => {
                                                  const updated = [...editInstallments];
                                                  updated[idx] = {...updated[idx], dueDate: e.target.value};
                                                  setEditInstallments(updated);
                                                }}
                                                disabled={inst.paid}
                                                className={`px-2 py-1 text-sm border rounded ${inst.paid ? 'bg-gray-200 text-gray-500' : 'border-gray-300 focus:ring-2 focus:ring-purple-500'}`}
                                              />
                                              {inst.paid && (
                                                <span className="text-xs bg-green-500 text-white px-2 py-1 rounded font-semibold">PAGA</span>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                        <p className="text-xs text-gray-500 mt-2">* Parcelas pagas não podem ser editadas</p>
                                      </div>
                                    )}
                                    
                                    {/* Seção de Renegociação */}
                                    <div className="border-t pt-4 mt-4">
                                      <button
                                        onClick={() => setShowRenegotiate(!showRenegotiate)}
                                        className="w-full bg-blue-100 hover:bg-blue-200 text-blue-700 px-4 py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2"
                                      >
                                        🔄 {showRenegotiate ? 'Fechar Renegociação' : 'Renegociar / Adicionar Parcelas'}
                                      </button>
                                      
                                      {showRenegotiate && (
                                        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                                          <h4 className="font-semibold text-blue-800 mb-3">➕ Adicionar Novas Parcelas</h4>
                                          <p className="text-xs text-blue-600 mb-3">Adicione valor extra dividido em novas parcelas</p>
                                          
                                          <div className="space-y-3">
                                            <div>
                                              <label className="block text-sm font-semibold text-blue-700 mb-1">💰 Valor a Adicionar</label>
                                              <input
                                                type="number"
                                                step="0.01"
                                                value={renegotiateForm.totalValue}
                                                onChange={e => setRenegotiateForm({...renegotiateForm, totalValue: e.target.value})}
                                                className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                placeholder="Ex: 500.00"
                                              />
                                            </div>
                                            
                                            <div className="grid grid-cols-2 gap-3">
                                              <div>
                                                <label className="block text-sm font-semibold text-blue-700 mb-1">📊 Qtd. Parcelas</label>
                                                <input
                                                  type="number"
                                                  min="1"
                                                  value={renegotiateForm.installments}
                                                  onChange={e => setRenegotiateForm({...renegotiateForm, installments: e.target.value})}
                                                  className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                />
                                              </div>
                                              <div>
                                                <label className="block text-sm font-semibold text-blue-700 mb-1">📅 Início</label>
                                                <input
                                                  type="date"
                                                  value={renegotiateForm.startDate}
                                                  onChange={e => setRenegotiateForm({...renegotiateForm, startDate: e.target.value})}
                                                  className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                />
                                              </div>
                                            </div>
                                            
                                            {renegotiateForm.totalValue && renegotiateForm.installments && (
                                              <p className="text-sm text-blue-700 bg-blue-100 p-2 rounded">
                                                📌 Cada nova parcela: <strong>R$ {(parseFloat(renegotiateForm.totalValue || '0') / parseInt(renegotiateForm.installments || '1')).toFixed(2)}</strong>
                                              </p>
                                            )}
                                            
                                            <button
                                              onClick={handleRenegotiate}
                                              disabled={isRenegotiating || !renegotiateForm.totalValue || !renegotiateForm.startDate}
                                              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-semibold transition disabled:opacity-50"
                                            >
                                              {isRenegotiating ? '⏳ Processando...' : '✅ Confirmar Renegociação'}
                                            </button>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <div className="flex gap-3 mt-6">
                                    <button
                                      onClick={() => setEditingSale(null)}
                                      className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold"
                                    >
                                      Cancelar
                                    </button>
                                    <button
                                      onClick={handleSaveEditSale}
                                      disabled={isSavingEdit || !editSaleForm.itemName || !editSaleForm.totalValue}
                                      className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold disabled:opacity-50"
                                    >
                                      {isSavingEdit ? 'Salvando...' : '💾 Salvar'}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                      </div>
                    </div>

                    {/* Barra de Progresso */}
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>Progresso do Pagamento</span>
                        <span>{progresso.toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all"
                          style={{ width: `${progresso}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-xs mt-1">
                        <span className="text-green-600">Pago: {formatCurrency(totalPago)}</span>
                        <span className="text-red-600">Pendente: {formatCurrency(totalPendente)}</span>
                      </div>
                    </div>

                    {/* Lista de Parcelas */}
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-gray-700 mb-2">Parcelas:</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {sale.installmentsR?.map((inst: any) => (
                          <div
                            key={inst.id}
                            className={`text-xs p-2 rounded ${
                              inst.paid
                                ? 'bg-green-100 text-green-800'
                                : new Date(inst.dueDate) < new Date()
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <span className="font-semibold">
                                {inst.paid ? '✓' : inst.sequence}ª
                              </span>
                              <span>{formatCurrency(inst.amount)}</span>
                            </div>
                            <div className="text-[10px] mt-1">
                              {inst.paid ? `Pago ${formatDate(inst.paidAt)}` : formatDate(inst.dueDate)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {sale.observations && (
                      <div className="mt-3 p-2 bg-gray-50 rounded text-sm text-gray-600">
                        <strong>Obs:</strong> {sale.observations}
                      </div>
                    )}
                  </div>
                );
              })}
              {sales.length === 0 && (
                <p className="text-gray-400 text-center py-12">Nenhuma venda registrada para este cliente</p>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-400">
              <p className="text-6xl mb-4">👈</p>
              <p className="text-lg">Selecione um cliente para ver o histórico</p>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Confirmação de Exclusão */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-800 mb-4">⚠️ Excluir Venda</h3>
            <p className="text-gray-600 mb-4">
              Tem certeza que deseja excluir a venda de <strong>{saleToDelete?.itemName}</strong> no valor de <strong>{formatCurrency(saleToDelete?.totalValue || 0)}</strong>?
            </p>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Motivo da exclusão: <span className="text-red-600">*</span>
              </label>
              <textarea
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-600 focus:outline-none resize-none"
                rows={3}
                placeholder="Digite o motivo da exclusão (obrigatório)..."
                title="Motivo da exclusão"
                aria-label="Motivo da exclusão"
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSaleToDelete(null);
                  setDeleteReason('');
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                disabled={!deleteReason.trim()}
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição de Data de Pagamento */}
      {editingPaymentDate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-800 mb-4">📅 Editar Data do Primeiro Pagamento</h3>
            <p className="text-gray-600 mb-4">
              Venda: <strong>{editingPaymentDate.itemName}</strong>
            </p>
            <p className="text-sm text-gray-500 mb-4">
              {editingPaymentDate.installments} parcelas • {formatCurrency(editingPaymentDate.totalValue)}
            </p>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Mês do Primeiro Pagamento:
              </label>
              <input
                type="month"
                value={newPaymentDate}
                onChange={(e) => setNewPaymentDate(e.target.value)}
                className="w-full px-3 py-3 border-2 border-blue-400 rounded-lg focus:border-blue-600 focus:outline-none text-lg font-semibold"
                min={new Date().toISOString().split('T')[0].substring(0, 7)}
                autoFocus
              />
              <p className="text-xs text-gray-600 mt-2">
                ⚠️ As datas de todas as parcelas serão recalculadas
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setEditingPaymentDate(null);
                  setNewPaymentDate('');
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpdatePaymentDate}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Atualizar Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CobrancaPage({ token }: { token: string }) {
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => {
    const load = async () => {
      const res = await fetch('/api/sales', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setSales(Array.isArray(data) ? data : []);
      setLoading(false);
    };
    load();
  }, [token]);

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  const formatDate = (dateStr?: string) => dateStr ? new Date(dateStr).toLocaleDateString('pt-BR') : '-';

  const parseMonthRange = (ym: string) => {
    const [y, m] = ym.split('-').map(Number);
    const start = new Date(y, (m || 1) - 1, 1, 0, 0, 0, 0);
    const end = new Date(y, (m || 1), 0, 23, 59, 59, 999);
    return { start, end };
  };

  const nextInstallment = (sale: any) => {
    const pending = (sale.installmentsR || []).filter((i: any) => !i.paid).sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    return pending[0];
  };

  const monthInstallment = (sale: any, start: Date, end: Date) => {
    const inMonth = (sale.installmentsR || [])
      .filter((i: any) => !i.paid && new Date(i.dueDate) >= start && new Date(i.dueDate) <= end)
      .sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    return inMonth[0];
  };

  const { start, end } = parseMonthRange(selectedMonth);
  const filteredSales = sales.filter((sale: any) => (sale.installmentsR || [])
    .some((i: any) => !i.paid && new Date(i.dueDate) >= start && new Date(i.dueDate) <= end));

  // Agrupar vendas por vendedora, depois por cliente
  const groupedBySeller = filteredSales.reduce((acc: any, sale: any) => {
    const sellerKey = sale.sellerName || 'Sem vendedora';
    const clientId = sale.client?.id || 0;
    
    if (!acc[sellerKey]) {
      acc[sellerKey] = {};
    }
    
    if (!acc[sellerKey][clientId]) {
      acc[sellerKey][clientId] = {
        client: sale.client,
        sales: []
      };
    }
    
    acc[sellerKey][clientId].sales.push(sale);
    return acc;
  }, {});

  // Ordenar vendedoras, e dentro de cada vendedora ordenar clientes
  const sortedBySellerAndClient = Object.entries(groupedBySeller)
    .sort((a: any, b: any) => {
      const sellerA = a[0].toUpperCase();
      const sellerB = b[0].toUpperCase();
      return sellerA.localeCompare(sellerB, 'pt-BR');
    })
    .map((entry: any) => ({
      seller: entry[0],
      clients: Object.values(entry[1]).sort((a: any, b: any) => {
        const nameA = (a.client?.name || '').toUpperCase();
        const nameB = (b.client?.name || '').toUpperCase();
        return nameA.localeCompare(nameB, 'pt-BR');
      })
    }));

  const generateReportText = () => {
    let text = '🧾 Relação de Cobrança\n';
    text += `Período: ${selectedMonth}\n`;
    sortedBySellerAndClient.forEach((sellerGroup: any) => {
      text += `\n💅 VENDEDORA: ${sellerGroup.seller}\n`;
      text += `${'='.repeat(40)}\n`;
      sellerGroup.clients.forEach((group: any) => {
        const address = group.client?.billingAddress || group.client?.address || group.client?.city || 'Sem endereço';
        text += `\n👤 ${group.client?.name || 'Cliente'}\n`;
        text += `📍 Cobrança: ${address}\n`;
        group.sales.forEach((sale: any) => {
          const paid = (sale.installmentsR || []).filter((i: any) => i.paid).reduce((s: number, i: any) => s + i.amount, 0);
          const pendingInst = monthInstallment(sale, start, end) || nextInstallment(sale);
          text += `  💎 ${sale.itemName}\n`;
          if (pendingInst) text += `  💵 Próx: ${formatCurrency(pendingInst.amount)} venc. ${formatDate(pendingInst.dueDate)}\n`;
          text += `  ✅ Pago: ${formatCurrency(paid)} / Total: ${formatCurrency(sale.totalValue)}\n`;
        });
      });
    });
    return text;
  };

  const handleWhats = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(generateReportText())}`;
    window.open(url, '_blank');
  };

  const handleEmail = () => {
    const subject = encodeURIComponent('Relação de Cobrança');
    const body = encodeURIComponent(generateReportText());
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handlePrint = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    
    let rows = '';
    sortedBySellerAndClient.forEach((sellerGroup: any) => {
      // Cabeçalho da vendedora
      rows += `<tr style="background: #f0f0f0;">
        <td colspan="6" style="font-weight: bold; padding: 12px; border-top: 2px solid #999;">
          💅 VENDEDORA: ${sellerGroup.seller}
        </td>
      </tr>`;
      
      sellerGroup.clients.forEach((group: any) => {
        const address = group.client?.billingAddress || group.client?.address || group.client?.city || 'Sem endereço';
        const clientRows = group.sales.map((sale: any, idx: number) => {
          const paid = (sale.installmentsR || []).filter((i: any) => i.paid).reduce((s: number, i: any) => s + i.amount, 0);
          const pending = sale.totalValue - paid;
          const pct = Math.max(0, Math.min(100, (paid / sale.totalValue) * 100));
          const next = monthInstallment(sale, start, end) || nextInstallment(sale);
          return `<tr>
            <td>${idx === 0 ? `<strong>${group.client?.name || ''}</strong><br><small>${address}</small>` : ''}</td>
            <td>${sale.itemName}</td>
            <td>${next ? formatCurrency(next.amount) + '<br><small>venc. ' + formatDate(next.dueDate) + '</small>' : '-'}</td>
            <td>${formatCurrency(paid)}</td>
            <td>${formatCurrency(sale.totalValue)}</td>
            <td>${formatCurrency(pending)}<br><small>${pct.toFixed(0)}% pago</small></td>
          </tr>`;
        }).join('');
        rows += clientRows;
      });
    });

    win.document.write(`<!doctype html><html><head><title>Relação de Cobrança - Detalhada</title><style>
      body { font-family: Arial, sans-serif; padding: 20px; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #ccc; padding: 8px; text-align: left; vertical-align: top; }
      th { background: #f5f5f5; }
      small { color: #666; font-size: 0.85em; }
    </style></head><body>
    <h2>Relação de Cobrança - Detalhada</h2>
    <p><strong>Período:</strong> ${selectedMonth}</p>
    <table><thead><tr>
      <th>Cliente / Endereço</th><th>Produto</th><th>Próxima parcela</th><th>Total pago</th><th>Total peça</th><th>Falta / %</th>
    </tr></thead><tbody>${rows}</tbody></table>
    <script>window.onload = () => setTimeout(() => window.print(), 400);</script>
    </body></html>`);
    win.document.close();
  };

  const handlePrintSummary = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    
    let rows = '';
    sortedBySellerAndClient.forEach((sellerGroup: any) => {
      // Cabeçalho da vendedora
      rows += `<tr style="background: #f0f0f0;">
        <td colspan="4" style="font-weight: bold; padding: 12px; border-top: 2px solid #999;">
          💅 VENDEDORA: ${sellerGroup.seller}
        </td>
      </tr>`;
      
      sellerGroup.clients.forEach((group: any) => {
        const address = group.client?.billingAddress || group.client?.address || group.client?.city || 'Sem endereço';
        // Somar todas as parcelas pendentes do período para este cliente
        let totalToReceive = 0;
        group.sales.forEach((sale: any) => {
          const pendingInPeriod = (sale.installmentsR || [])
            .filter((i: any) => !i.paid && new Date(i.dueDate) >= start && new Date(i.dueDate) <= end)
            .reduce((sum: number, inst: any) => sum + inst.amount, 0);
          totalToReceive += pendingInPeriod;
        });
        
        rows += `<tr>
          <td><strong>${group.client?.name || ''}</strong></td>
          <td>${address}</td>
          <td style="text-align: right;"><strong>${formatCurrency(totalToReceive)}</strong></td>
          <td style="min-height: 60px; border: 1px solid #999;">&nbsp;</td>
        </tr>`;
      });
    });

    win.document.write(`<!doctype html><html><head><title>Relação de Cobrança - Resumida</title><style>
      body { font-family: Arial, sans-serif; padding: 20px; }
      h2 { margin-bottom: 5px; }
      table { width: 100%; border-collapse: collapse; margin-top: 20px; }
      th, td { border: 1px solid #ccc; padding: 12px; text-align: left; vertical-align: top; }
      th { background: #f5f5f5; font-weight: bold; }
      td:last-child { min-width: 200px; }
    </style></head><body>
    <h2>Relação de Cobrança - Resumida</h2>
    <p><strong>Período:</strong> ${selectedMonth}</p>
    <table><thead><tr>
      <th style="width: 25%;">Cliente</th>
      <th style="width: 30%;">Endereço de Cobrança</th>
      <th style="width: 15%; text-align: right;">Total a Receber</th>
      <th style="width: 30%;">Observações</th>
    </tr></thead><tbody>${rows}</tbody></table>
    <script>window.onload = () => setTimeout(() => window.print(), 400);</script>
    </body></html>`);
    win.document.close();
  };

  const totalSummary = filteredSales.reduce((acc, sale) => {
    const paid = (sale.installmentsR || []).filter((i: any) => i.paid).reduce((s: number, i: any) => s + i.amount, 0);
    acc.paid += paid;
    acc.total += sale.totalValue || 0;
    return acc;
  }, { paid: 0, total: 0 });

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-800">🧾 Relação de Cobrança</h2>
          <p className="text-sm text-gray-600">Endereços de cobrança, valores de parcelas, pagos e faltantes (ordenado alfabeticamente).</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-700">Mês:</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="border rounded px-2 py-1"
            title="Selecionar mês para relatório"
            aria-label="Selecionar mês para relatório"
          />
        </div>
        <div className="flex gap-2">
          <button onClick={handlePrint} className="px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm" title="Versão detalhada com todos os produtos">🖨️ PDF Detalhado</button>
          <button onClick={handlePrintSummary} className="px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm" title="Versão resumida por cliente">📋 PDF Resumido</button>
          <button onClick={handleEmail} className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700" title="Enviar por e-mail">✉️ E-mail</button>
          <button onClick={handleWhats} className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700" title="WhatsApp">📱 WhatsApp</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <div className="p-3 bg-green-50 border border-green-200 rounded">
          <p className="text-xs text-gray-600">Total pago</p>
          <p className="text-xl font-bold text-green-700">{formatCurrency(totalSummary.paid)}</p>
        </div>
        <div className="p-3 bg-blue-50 border border-blue-200 rounded">
          <p className="text-xs text-gray-600">Total peças</p>
          <p className="text-xl font-bold text-blue-700">{formatCurrency(totalSummary.total)}</p>
        </div>
        <div className="p-3 bg-orange-50 border border-orange-200 rounded">
          <p className="text-xs text-gray-600">Falta receber</p>
          <p className="text-xl font-bold text-orange-700">{formatCurrency(totalSummary.total - totalSummary.paid)}</p>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500">Carregando...</p>
      ) : filteredSales.length === 0 ? (
        <p className="text-gray-500">Nenhum registro no período selecionado.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left p-2">Cliente / Endereço</th>
                <th className="text-left p-2">Produto</th>
                <th className="text-left p-2">Próxima parcela</th>
                <th className="text-right p-2">Total pago</th>
                <th className="text-right p-2">Valor total</th>
                <th className="text-right p-2">Falta / %</th>
              </tr>
            </thead>
            <tbody>
              {sortedBySellerAndClient.map((sellerGroup: any) => (
                <Fragment key={sellerGroup.seller}>
                  {/* Cabeçalho da vendedora */}
                  <tr className="bg-pink-50 border-b-2 border-pink-300">
                    <td colSpan={6} className="p-3 font-bold text-pink-800">
                      💅 VENDEDORA: {sellerGroup.seller}
                    </td>
                  </tr>
                  {/* Clientes dessa vendedora */}
                  {sellerGroup.clients.map((group: any) => {
                    const address = group.client?.billingAddress || group.client?.address || group.client?.city || 'Sem endereço';
                    return (
                      <Fragment key={group.client?.id || 0}>
                        {group.sales.map((sale: any, idx: number) => {
                          const paid = (sale.installmentsR || []).filter((i: any) => i.paid).reduce((s: number, i: any) => s + i.amount, 0);
                          const pending = sale.totalValue - paid;
                          const pct = Math.max(0, Math.min(100, (paid / sale.totalValue) * 100));
                          const next = monthInstallment(sale, start, end) || nextInstallment(sale);
                          return (
                            <tr key={sale.id} className="border-b hover:bg-gray-50">
                              <td className="p-2 align-top">
                                {idx === 0 ? (
                                  <div>
                                    <div className="font-bold text-gray-800">{group.client?.name}</div>
                                    <div className="text-xs text-gray-600 mt-1">📍 {address}</div>
                                  </div>
                                ) : null}
                              </td>
                              <td className="p-2 text-gray-700">{sale.itemName}</td>
                              <td className="p-2 text-gray-700">
                                {next ? (
                                  <div>
                                    <div className="font-semibold text-green-700">{formatCurrency(next.amount)}</div>
                                    <div className="text-xs text-gray-500">Venc: {formatDate(next.dueDate)}</div>
                                  </div>
                                ) : <span className="text-gray-400">-</span>}
                              </td>
                              <td className="p-2 text-right text-green-700 font-semibold">{formatCurrency(paid)}</td>
                              <td className="p-2 text-right text-gray-800 font-semibold">{formatCurrency(sale.totalValue)}</td>
                              <td className="p-2 text-right text-orange-700 font-semibold">
                                {formatCurrency(pending)}
                                <div className="text-xs text-gray-500">{pct.toFixed(0)}% recebido</div>
                              </td>
                            </tr>
                          );
                        })}
                      </Fragment>
                    );
                  })}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function RelatorioPage({ token, clients }: { token: string, clients: any[] }) {
  const [period, setPeriod] = useState('month');
  const [selectedClients, setSelectedClients] = useState<number[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const clientIdsParam = JSON.stringify(selectedClients);
      const res = await fetch(`/api/sales/analytics?period=${period}&clientIds=${encodeURIComponent(clientIdsParam)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setAnalytics(data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
    setLoading(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const toggleClient = (clientId: number) => {
    setSelectedClients(prev =>
      prev.includes(clientId)
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
  };

  const selectAllClients = () => {
    if (selectedClients.length === clients.length) {
      setSelectedClients([]);
    } else {
      setSelectedClients(clients.map(c => c.id));
    }
  };

  return (
    <div className="w-full">
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">📊 Fechamento de Vendas</h2>

        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Seleção de Período */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">Período</label>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setPeriod('week')}
                className={`px-4 py-2 rounded ${period === 'week' ? 'bg-purple-600 text-white' : 'bg-gray-200'}`}
              >
                📅 Semana
              </button>
              <button
                onClick={() => setPeriod('15days')}
                className={`px-4 py-2 rounded ${period === '15days' ? 'bg-purple-600 text-white' : 'bg-gray-200'}`}
              >
                📆 15 Dias
              </button>
              <button
                onClick={() => setPeriod('month')}
                className={`px-4 py-2 rounded ${period === 'month' ? 'bg-purple-600 text-white' : 'bg-gray-200'}`}
              >
                📋 Mês
              </button>
              <button
                onClick={() => setPeriod('year')}
                className={`px-4 py-2 rounded ${period === 'year' ? 'bg-purple-600 text-white' : 'bg-gray-200'}`}
              >
                📊 Ano
              </button>
            </div>
          </div>

          {/* Seleção de Clientes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">Clientes</label>
            <button
              onClick={selectAllClients}
              className="px-3 py-2 bg-blue-500 text-white rounded text-sm mb-2 w-full"
            >
              {selectedClients.length === clients.length ? '❌ Desselecionar Todos' : '✅ Selecionar Todos'}
            </button>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
              {clients.map(client => (
                <label key={client.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedClients.includes(client.id)}
                    onChange={() => toggleClient(client.id)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-700">{client.name}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={loadAnalytics}
          disabled={loading}
          className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50"
        >
          {loading ? '⏳ Carregando...' : '🔍 Gerar Relatório'}
        </button>
      </div>

      {/* Resultados */}
      {analytics && (
        <div className="space-y-6">
          {/* Resumo Geral */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <p className="text-gray-500 text-sm mb-2">Total de Vendas</p>
              <p className="text-3xl font-bold text-purple-600">{analytics.totalSales}</p>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-6">
              <p className="text-gray-500 text-sm mb-2">Receita Total</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(analytics.totalRevenue)}</p>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-6">
              <p className="text-gray-500 text-sm mb-2">Ticket Médio</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(analytics.totalSales > 0 ? analytics.totalRevenue / analytics.totalSales : 0)}
              </p>
            </div>
          </div>

          {/* Vendas por Período */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">💰 Vendas por Período</h3>
            <div className="space-y-4">
              {Object.entries(analytics.byPeriod).map(([periodName, data]: [string, any]) => (
                <div key={periodName} className="border-l-4 border-purple-600 pl-4 py-3 bg-gray-50 rounded">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-gray-800">{periodName}</p>
                      <p className="text-sm text-gray-600">{data.count} {data.count === 1 ? 'venda' : 'vendas'}</p>
                    </div>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(data.total)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Vendas por Cliente */}
          {Object.keys(analytics.byClient).length > 0 && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">👥 Vendas por Cliente</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100 border-b-2 border-gray-300">
                    <tr>
                      <th className="px-4 py-2 text-left text-gray-700 font-semibold">Cliente</th>
                      <th className="px-4 py-2 text-center text-gray-700 font-semibold">Vendas</th>
                      <th className="px-4 py-2 text-right text-gray-700 font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(analytics.byClient).map(([clientName, data]: [string, any]) => (
                      <tr key={clientName} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-800">{clientName}</td>
                        <td className="px-4 py-3 text-center text-gray-600">{data.sales.length}</td>
                        <td className="px-4 py-3 text-right font-bold text-green-600">{formatCurrency(data.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Detalhe das Vendas */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">🛍️ Detalhe das Vendas</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b-2 border-gray-300">
                  <tr>
                    <th className="px-4 py-2 text-left text-gray-700 font-semibold">Data</th>
                    <th className="px-4 py-2 text-left text-gray-700 font-semibold">Cliente</th>
                    <th className="px-4 py-2 text-left text-gray-700 font-semibold">Produto</th>
                    <th className="px-4 py-2 text-center text-gray-700 font-semibold">Parcelas</th>
                    <th className="px-4 py-2 text-right text-gray-700 font-semibold">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.allSales.map((sale: any) => (
                    <tr key={sale.id} className={`border-b hover:bg-gray-50 ${sale.isExchange ? 'bg-orange-50' : ''}`}>
                      <td className="px-4 py-3 text-gray-600 text-sm">
                        {new Date(sale.saleDate).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3 text-gray-800 font-medium">{sale.client.name}</td>
                      <td className="px-4 py-3 text-gray-700">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span>{sale.itemName}</span>
                          {sale.isExchange && (
                            <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                              🔄 TROCA
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600">{sale.installments}x</td>
                      <td className="px-4 py-3 text-right font-bold text-green-600">{formatCurrency(sale.totalValue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {!analytics && (
        <div className="bg-white rounded-xl shadow-lg p-12 text-center">
          <p className="text-gray-400 text-lg">👈 Selecione os filtros e clique em "Gerar Relatório"</p>
        </div>
      )}
    </div>
  );
}

function ConfigPage({ token }: { token: string }) {
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testStatus, setTestStatus] = useState('');
  
  // Estados para senhas
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changePasswordStatus, setChangePasswordStatus] = useState('');
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);
  
  const [adminPassword, setAdminPassword] = useState('');
  const [adminPasswordConfirm, setAdminPasswordConfirm] = useState('');
  const [adminPasswordStatus, setAdminPasswordStatus] = useState('');
  const [adminPasswordLoading, setAdminPasswordLoading] = useState(false);

  // Estados para criar novo usuário
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserStatus, setNewUserStatus] = useState('');
  const [newUserLoading, setNewUserLoading] = useState(false);

  // Estados para gerenciar usuários
  const [users, setUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editUserEmail, setEditUserEmail] = useState('');
  const [editUserPassword, setEditUserPassword] = useState('');

  // Estados para teste de email
  const [testEmail, setTestEmail] = useState('');
  const [testEmailStatus, setTestEmailStatus] = useState('');

  useEffect(() => {
    loadSettings();
    loadUsers();
  }, []);

  const loadSettings = async () => {
    const res = await fetch('/api/settings', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setSettings(data);
  };

  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const res = await fetch('/api/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setUsers(data);
      }
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    }
    setUsersLoading(false);
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) return;
    
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        loadUsers();
        alert('✅ Usuário excluído com sucesso!');
      } else {
        const error = await res.json();
        alert('❌ ' + (error.error || 'Erro ao excluir'));
      }
    } catch (error) {
      alert('❌ Erro: ' + error);
    }
  };

  const handleEditUser = (user: any) => {
    setEditingUser(user);
    setEditUserEmail(user.email);
    setEditUserPassword('');
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;
    
    try {
      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          email: editUserEmail,
          password: editUserPassword || undefined
        })
      });
      
      if (res.ok) {
        setEditingUser(null);
        loadUsers();
        alert('✅ Usuário atualizado com sucesso!');
      } else {
        const error = await res.json();
        alert('❌ ' + (error.error || 'Erro ao atualizar'));
      }
    } catch (error) {
      alert('❌ Erro: ' + error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(settings)
      });
      alert('✅ Configurações salvas com sucesso!');
    } catch (error) {
      alert('❌ Erro ao salvar: ' + error);
    }
    setLoading(false);
  };

  const handleTest = async () => {
    if (!testPhone) {
      alert('Digite um número de telefone');
      return;
    }

    setTestStatus('Enviando...');
    try {
      const res = await fetch('/api/settings/test-whatsapp', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ phone: testPhone })
      });

      if (res.ok) {
        setTestStatus('✅ Mensagem enviada com sucesso!');
      } else {
        const error = await res.json();
        setTestStatus('❌ Erro: ' + error.error);
      }
    } catch (error) {
      setTestStatus('❌ Erro: ' + error);
    }
  };

  const handleChangePassword = async () => {
    setChangePasswordStatus('');
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      setChangePasswordStatus('❌ Preencha todos os campos');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setChangePasswordStatus('❌ As senhas não conferem');
      return;
    }
    
    if (newPassword.length < 6) {
      setChangePasswordStatus('❌ Senha deve ter pelo menos 6 caracteres');
      return;
    }

    setChangePasswordLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });

      if (res.ok) {
        setChangePasswordStatus('✅ Senha alterada com sucesso!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        const error = await res.json();
        setChangePasswordStatus('❌ ' + (error.error || 'Erro ao alterar senha'));
      }
    } catch (error) {
      setChangePasswordStatus('❌ Erro: ' + error);
    }
    setChangePasswordLoading(false);
  };

  const handleSetAdminPassword = async () => {
    setAdminPasswordStatus('');
    
    if (!adminPassword || !adminPasswordConfirm) {
      setAdminPasswordStatus('❌ Preencha todos os campos');
      return;
    }
    
    if (adminPassword !== adminPasswordConfirm) {
      setAdminPasswordStatus('❌ As senhas não conferem');
      return;
    }
    
    if (adminPassword.length < 6) {
      setAdminPasswordStatus('❌ Senha deve ter pelo menos 6 caracteres');
      return;
    }

    setAdminPasswordLoading(true);
    try {
      const res = await fetch('/api/auth/admin-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          adminPassword
        })
      });

      if (res.ok) {
        setAdminPasswordStatus('✅ Senha de admin configurada com sucesso!');
        setAdminPassword('');
        setAdminPasswordConfirm('');
      } else {
        const error = await res.json();
        setAdminPasswordStatus('❌ ' + (error.error || 'Erro ao configurar senha de admin'));
      }
    } catch (error) {
      setAdminPasswordStatus('❌ Erro: ' + error);
    }
    setAdminPasswordLoading(false);
  };

  const handleCreateUser = async () => {
    setNewUserStatus('');
    
    if (!newUserEmail || !newUserPassword) {
      setNewUserStatus('❌ Preencha email e senha');
      return;
    }
    
    if (newUserPassword.length < 6) {
      setNewUserStatus('❌ Senha deve ter pelo menos 6 caracteres');
      return;
    }

    setNewUserLoading(true);
    try {
      const res = await fetch('/api/auth/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          email: newUserEmail,
          password: newUserPassword
        })
      });

      if (res.ok) {
        setNewUserStatus('✅ Usuário criado com sucesso!');
        setNewUserEmail('');
        setNewUserPassword('');
      } else {
        const error = await res.json();
        setNewUserStatus('❌ ' + (error.error || 'Erro ao criar usuário'));
      }
    } catch (error) {
      setNewUserStatus('❌ Erro: ' + error);
    }
    setNewUserLoading(false);
  };

  const handleTestEmail = async () => {
    if (!testEmail) {
      setTestEmailStatus('❌ Digite um email de destino');
      return;
    }

    setTestEmailStatus('📧 Enviando...');
    try {
      const res = await fetch('/api/settings/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ email: testEmail })
      });

      if (res.ok) {
        setTestEmailStatus('✅ Email enviado com sucesso!');
      } else {
        const error = await res.json();
        setTestEmailStatus('❌ ' + (error.error || 'Erro ao enviar email'));
      }
    } catch (error) {
      setTestEmailStatus('❌ Erro: ' + error);
    }
  };

  const updateSetting = (key: string, value: any) => {
    setSettings({ ...settings, [key]: value });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">⚙️ Configurações</h2>

        {/* WhatsApp */}
        <div className="mb-8">
          <h3 className="text-xl font-bold text-gray-700 mb-4 border-b pb-2">📱 WhatsApp</h3>
          
          <div className="mb-4">
            <label className="block font-semibold mb-2">Provider</label>
            <select 
              className="w-full p-3 border rounded-lg"
              value={settings.whatsappProvider || 'mock'}
              onChange={(e) => updateSetting('whatsappProvider', e.target.value)}
              title="Provedor de WhatsApp"
            >
              <option value="mock">Mock (Teste - não envia)</option>
              <option value="twilio">Twilio</option>
              <option value="meta">Meta (WhatsApp Business API)</option>
            </select>
          </div>

          {settings.whatsappProvider === 'twilio' && (
            <>
              <div className="mb-4">
                <label className="block font-semibold mb-2">Twilio Account SID</label>
                <input 
                  type="text" 
                  className="w-full p-3 border rounded-lg"
                  value={settings.twilioAccountSid || ''}
                  onChange={(e) => updateSetting('twilioAccountSid', e.target.value)}
                  placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                />
              </div>
              <div className="mb-4">
                <label className="block font-semibold mb-2">Twilio Auth Token</label>
                <input 
                  type="password" 
                  className="w-full p-3 border rounded-lg"
                  value={settings.twilioAuthToken || ''}
                  onChange={(e) => updateSetting('twilioAuthToken', e.target.value)}
                />
              </div>
              <div className="mb-4">
                <label className="block font-semibold mb-2">Número Twilio (From)</label>
                <input 
                  type="text" 
                  className="w-full p-3 border rounded-lg"
                  value={settings.twilioFrom || ''}
                  onChange={(e) => updateSetting('twilioFrom', e.target.value)}
                  placeholder="+14155238886"
                />
              </div>
            </>
          )}

          {settings.whatsappProvider === 'meta' && (
            <>
              <div className="mb-4">
                <label className="block font-semibold mb-2">Meta Access Token</label>
                <input 
                  type="password" 
                  className="w-full p-3 border rounded-lg"
                  value={settings.metaToken || ''}
                  onChange={(e) => updateSetting('metaToken', e.target.value)}
                />
              </div>
              <div className="mb-4">
                <label className="block font-semibold mb-2">Phone Number ID</label>
                <input 
                  type="text" 
                  className="w-full p-3 border rounded-lg"
                  value={settings.metaPhoneNumberId || ''}
                  onChange={(e) => updateSetting('metaPhoneNumberId', e.target.value)}
                  placeholder="123456789012345"
                />
              </div>
            </>
          )}

          <div className="mb-4">
            <label className="block font-semibold mb-2">Número do Administrador (para receber cópias)</label>
            <input 
              type="text" 
              className="w-full p-3 border rounded-lg"
              value={settings.adminPhone || ''}
              onChange={(e) => updateSetting('adminPhone', e.target.value)}
              placeholder="+5511999999999"
            />
            <p className="text-sm text-gray-600 mt-1">Formato internacional com +55</p>
          </div>

          {/* Teste */}
          <div className="bg-gray-50 p-4 rounded-lg border">
            <h4 className="font-semibold mb-3">🧪 Testar Envio</h4>
            <div className="flex gap-2">
              <input 
                type="text" 
                className="flex-1 p-3 border rounded-lg"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="+5511999999999"
              />
              <button 
                onClick={handleTest}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Enviar Teste
              </button>
            </div>
            {testStatus && <p className="mt-2 text-sm">{testStatus}</p>}
          </div>
        </div>

        {/* Senhas */}
        <div className="mb-8">
          <h3 className="text-xl font-bold text-gray-700 mb-4 border-b pb-2">🔐 Senhas</h3>
          
          {/* Alterar Senha */}
          <div className="mb-8 bg-blue-50 p-6 rounded-lg">
            <h4 className="font-bold text-gray-700 mb-4">🔑 Alterar Minha Senha</h4>
            
            <div className="mb-4">
              <label className="block font-semibold mb-2 text-gray-700">Senha Atual</label>
              <input 
                type="password" 
                className="w-full p-3 border rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Digite sua senha atual"
              />
            </div>

            <div className="mb-4">
              <label className="block font-semibold mb-2 text-gray-700">Nova Senha</label>
              <input 
                type="password" 
                className="w-full p-3 border rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Digite a nova senha (mín. 6 caracteres)"
              />
            </div>

            <div className="mb-4">
              <label className="block font-semibold mb-2 text-gray-700">Confirmar Nova Senha</label>
              <input 
                type="password" 
                className="w-full p-3 border rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirme a nova senha"
              />
            </div>

            {changePasswordStatus && (
              <p className={`mb-4 p-3 rounded ${changePasswordStatus.includes('✅') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {changePasswordStatus}
              </p>
            )}

            <button 
              onClick={handleChangePassword}
              disabled={changePasswordLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition"
            >
              {changePasswordLoading ? '⏳ Alterando...' : '✓ Alterar Senha'}
            </button>
          </div>

          {/* Senha de Admin */}
          <div className="bg-red-50 p-6 rounded-lg">
            <h4 className="font-bold text-gray-700 mb-4">🛡️ Senha de Admin (para Reset de Conta)</h4>
            <p className="text-sm text-gray-600 mb-4">Use esta senha para resetar contas bloqueadas ou fazer alterações administrativas.</p>
            
            <div className="mb-4">
              <label className="block font-semibold mb-2 text-gray-700">Senha de Admin</label>
              <input 
                type="password" 
                className="w-full p-3 border rounded-lg focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Digite a senha de admin (mín. 6 caracteres)"
              />
            </div>

            <div className="mb-4">
              <label className="block font-semibold mb-2 text-gray-700">Confirmar Senha de Admin</label>
              <input 
                type="password" 
                className="w-full p-3 border rounded-lg focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
                value={adminPasswordConfirm}
                onChange={(e) => setAdminPasswordConfirm(e.target.value)}
                placeholder="Confirme a senha de admin"
              />
            </div>

            {adminPasswordStatus && (
              <p className={`mb-4 p-3 rounded ${adminPasswordStatus.includes('✅') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {adminPasswordStatus}
              </p>
            )}

            <button 
              onClick={handleSetAdminPassword}
              disabled={adminPasswordLoading}
              className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition"
            >
              {adminPasswordLoading ? '⏳ Configurando...' : '✓ Configurar Senha de Admin'}
            </button>
          </div>

          {/* Criar Novo Usuário */}
          <div className="bg-green-50 p-6 rounded-lg mt-6">
            <h4 className="font-bold text-gray-700 mb-4">👤 Criar Novo Usuário</h4>
            <p className="text-sm text-gray-600 mb-4">Adicione novos usuários que poderão acessar o sistema.</p>
            
            <div className="mb-4">
              <label className="block font-semibold mb-2 text-gray-700">Email do Novo Usuário</label>
              <input 
                type="email" 
                className="w-full p-3 border rounded-lg focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="email@exemplo.com"
              />
            </div>

            <div className="mb-4">
              <label className="block font-semibold mb-2 text-gray-700">Senha</label>
              <input 
                type="password" 
                className="w-full p-3 border rounded-lg focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none"
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                placeholder="Senha (mín. 6 caracteres)"
              />
            </div>

            {newUserStatus && (
              <p className={`mb-4 p-3 rounded ${newUserStatus.includes('✅') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {newUserStatus}
              </p>
            )}

            <button 
              onClick={handleCreateUser}
              disabled={newUserLoading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition"
            >
              {newUserLoading ? '⏳ Criando...' : '➕ Criar Usuário'}
            </button>
          </div>

          {/* Lista de Usuários */}
          <div className="bg-gray-50 p-6 rounded-lg mt-6">
            <h4 className="font-bold text-gray-700 mb-4">📋 Usuários Cadastrados</h4>
            
            {usersLoading ? (
              <p className="text-gray-500">Carregando...</p>
            ) : users.length === 0 ? (
              <p className="text-gray-500">Nenhum usuário cadastrado.</p>
            ) : (
              <div className="space-y-3">
                {users.map((user) => (
                  <div key={user.id} className="bg-white p-4 rounded-lg border flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-gray-800">{user.email}</p>
                      <p className="text-xs text-gray-500">ID: {user.id}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditUser(user)}
                        className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded"
                      >
                        ✏️ Editar
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-sm rounded"
                      >
                        🗑️ Excluir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Modal de Edição */}
            {editingUser && (
              <div
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                onClick={() => setEditingUser(null)}
                role="button"
                tabIndex={0}
                aria-label="Fechar edição de usuário"
                onKeyDown={(e) => {
                  if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setEditingUser(null);
                  }
                }}
              >
                <div
                  className="bg-white rounded-xl shadow-2xl max-w-md w-full"
                  onClick={e => e.stopPropagation()}
                  role="dialog"
                  aria-modal="true"
                >
                  <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white p-6 rounded-t-xl">
                    <div className="flex justify-between items-start">
                      <div>
                        <h2 className="text-xl font-bold">✏️ Editar Usuário</h2>
                        <p className="text-sm mt-1 opacity-90">ID: {editingUser.id}</p>
                      </div>
                      <button onClick={() => setEditingUser(null)} className="text-2xl hover:opacity-70">×</button>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="mb-4">
                      <label className="block font-semibold mb-2 text-gray-700">Email</label>
                      <input 
                        type="email" 
                        className="w-full p-3 border rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                        value={editUserEmail}
                        onChange={(e) => setEditUserEmail(e.target.value)}
                      />
                    </div>

                    <div className="mb-6">
                      <label className="block font-semibold mb-2 text-gray-700">Nova Senha (deixe vazio para manter)</label>
                      <input 
                        type="password" 
                        className="w-full p-3 border rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                        value={editUserPassword}
                        onChange={(e) => setEditUserPassword(e.target.value)}
                        placeholder="Nova senha (opcional)"
                      />
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => setEditingUser(null)}
                        className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 p-3 rounded-lg font-semibold transition"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleSaveUser}
                        className="flex-1 bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-lg font-semibold transition"
                      >
                        💾 Salvar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Configurações de Email */}
        <div className="mb-8">
          <h3 className="text-xl font-bold text-gray-700 mb-4 border-b pb-2">📧 Configurações de Email (SMTP)</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block font-semibold mb-2">Servidor SMTP</label>
              <input 
                type="text" 
                className="w-full p-3 border rounded-lg"
                value={settings.smtpHost || ''}
                onChange={(e) => updateSetting('smtpHost', e.target.value)}
                placeholder="smtp.umbler.com"
              />
            </div>
            <div>
              <label className="block font-semibold mb-2">Porta</label>
              <input 
                type="number" 
                className="w-full p-3 border rounded-lg"
                value={settings.smtpPort || '587'}
                onChange={(e) => updateSetting('smtpPort', e.target.value)}
                placeholder="587"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block font-semibold mb-2">Email (usuário)</label>
              <input 
                type="email" 
                className="w-full p-3 border rounded-lg"
                value={settings.smtpUser || ''}
                onChange={(e) => updateSetting('smtpUser', e.target.value)}
                placeholder="email@seudominio.com"
              />
            </div>
            <div>
              <label className="block font-semibold mb-2">Senha do Email</label>
              <input 
                type="password" 
                className="w-full p-3 border rounded-lg"
                value={settings.smtpPassword || ''}
                onChange={(e) => updateSetting('smtpPassword', e.target.value)}
                placeholder="Senha do email"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block font-semibold mb-2">Nome do Remetente</label>
            <input 
              type="text" 
              className="w-full p-3 border rounded-lg"
              value={settings.smtpFromName || ''}
              onChange={(e) => updateSetting('smtpFromName', e.target.value)}
              placeholder="Vani e Elo Joias"
            />
          </div>

          <div className="mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={settings.smtpSecure === 'true'}
                onChange={(e) => updateSetting('smtpSecure', e.target.checked ? 'true' : 'false')}
                className="w-5 h-5"
              />
              <span className="font-semibold">Usar TLS/SSL</span>
            </label>
            <p className="text-sm text-gray-600 mt-1">Marque se o servidor usar criptografia (recomendado para porta 587 com STARTTLS)</p>
          </div>

          {/* Teste de Email */}
          <div className="bg-gray-50 p-4 rounded-lg border">
            <h4 className="font-semibold mb-3">🧪 Testar Envio de Email</h4>
            <div className="flex gap-2">
              <input 
                type="email" 
                className="flex-1 p-3 border rounded-lg"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="email@destino.com"
              />
              <button 
                onClick={handleTestEmail}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Enviar Teste
              </button>
            </div>
            {testEmailStatus && <p className="mt-2 text-sm">{testEmailStatus}</p>}
          </div>
        </div>

        {/* Lembretes */}
        <div className="mb-8">
          <h3 className="text-xl font-bold text-gray-700 mb-4 border-b pb-2">⏰ Lembretes Automáticos</h3>
          
          <div className="mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={settings.remindersEnabled === 'true'}
                onChange={(e) => updateSetting('remindersEnabled', e.target.checked ? 'true' : 'false')}
                className="w-5 h-5"
              />
              <span className="font-semibold">Habilitar lembretes automáticos</span>
            </label>
          </div>

          <div className="mb-4">
            <label className="block font-semibold mb-2">Dias antes do vencimento</label>
            <input 
              type="number" 
              className="w-full p-3 border rounded-lg"
              min="1"
              max="30"
              value={settings.reminderDaysBefore || '3'}
              onChange={(e) => updateSetting('reminderDaysBefore', e.target.value)}
            />
          </div>

          <div className="mb-4">
            <label className="block font-semibold mb-2">Template da Mensagem</label>
            <textarea 
              className="w-full p-3 border rounded-lg font-mono text-sm"
              rows={5}
              value={settings.reminderTemplate || 'Olá {{cliente}}! Lembrete da parcela {{parcela}}/{{total}} da joia "{{item}}". Valor: R$ {{valor}}. Vencimento: {{vencimento}}.'}
              onChange={(e) => updateSetting('reminderTemplate', e.target.value)}
            />
            <p className="text-sm text-gray-600 mt-1">
              Variáveis disponíveis: {'{{cliente}}, {{parcela}}, {{total}}, {{item}}, {{valor}}, {{vencimento}}'}
            </p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
            <p className="text-sm text-yellow-800">
              ⚠️ Os lembretes são enviados diariamente às 08:00 (horário do servidor)
            </p>
          </div>
        </div>

        <button 
          onClick={handleSave}
          disabled={loading}
          className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50"
        >
          {loading ? '💾 Salvando...' : '💾 Salvar Configurações'}
        </button>
      </div>
    </div>
  );
}



