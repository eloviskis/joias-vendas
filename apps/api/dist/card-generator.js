export function generateCardHTML(data) {
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const formatCurrency = (value) => {
        return `R$ ${value.toFixed(2).replace('.', ',')}`;
    };
    const year = data.saleDate.getFullYear();
    const installmentsByYear = {};
    data.installments.forEach(inst => {
        const y = inst.dueDate.getFullYear();
        if (!installmentsByYear[y])
            installmentsByYear[y] = [];
        installmentsByYear[y].push(inst);
    });
    let leftColumn = '';
    let rightColumn = '';
    // Primeiro ano (coluna esquerda)
    const firstYear = Math.min(...Object.keys(installmentsByYear).map(Number));
    if (installmentsByYear[firstYear]) {
        installmentsByYear[firstYear].forEach(inst => {
            const month = months[inst.dueDate.getMonth()];
            const value = formatCurrency(inst.amount);
            const status = inst.paid ? '✓ PAGO' : '';
            leftColumn += `
        <tr>
          <td style="padding: 4px 8px; border-bottom: 1px solid #ddd;">${month}</td>
          <td style="padding: 4px 8px; border-bottom: 1px solid #ddd; text-align: right;">${value}</td>
          <td style="padding: 4px 8px; border-bottom: 1px solid #ddd; text-align: center; color: green; font-weight: bold;">${status}</td>
        </tr>
      `;
        });
    }
    // Segundo ano (coluna direita)
    const secondYear = firstYear + 1;
    if (installmentsByYear[secondYear]) {
        installmentsByYear[secondYear].forEach(inst => {
            const month = months[inst.dueDate.getMonth()];
            const value = formatCurrency(inst.amount);
            const status = inst.paid ? '✓ PAGO' : '';
            rightColumn += `
        <tr>
          <td style="padding: 4px 8px; border-bottom: 1px solid #ddd;">${month}</td>
          <td style="padding: 4px 8px; border-bottom: 1px solid #ddd; text-align: right;">${value}</td>
          <td style="padding: 4px 8px; border-bottom: 1px solid #ddd; text-align: center; color: green; font-weight: bold;">${status}</td>
        </tr>
      `;
        });
    }
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 20px;
      background: white;
    }
    .card {
      max-width: 800px;
      border: 2px solid #333;
      padding: 20px;
      background: white;
    }
    .header {
      border-bottom: 3px solid #333;
      padding-bottom: 10px;
      margin-bottom: 15px;
    }
    .title {
      font-size: 24px;
      font-weight: bold;
      margin: 0;
    }
    .client {
      font-size: 16px;
      margin: 5px 0;
    }
    .section-title {
      font-size: 18px;
      font-weight: bold;
      margin: 15px 0 10px 0;
      text-align: center;
    }
    .columns {
      display: flex;
      gap: 20px;
    }
    .column {
      flex: 1;
    }
    .year-label {
      font-size: 14px;
      font-weight: bold;
      text-align: center;
      margin-bottom: 5px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }
    .date {
      font-size: 14px;
      text-align: right;
      margin-top: 10px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div class="title">Vani e Elo Joias ☐</div>
        <div style="font-size: 12px;">Data: ${new Date(data.saleDate).toLocaleDateString('pt-BR')}</div>
      </div>
      <div class="client">Cliente: ${data.clientName}</div>
    </div>

    <div class="section-title">CONTROLE DE PARCELAS</div>
    
    <div class="columns">
      <div class="column">
        <div class="year-label">ANO: ${firstYear}</div>
        <table>
          ${leftColumn || '<tr><td colspan="3" style="text-align: center; padding: 10px;">-</td></tr>'}
        </table>
      </div>
      
      <div class="column">
        <div class="year-label">ANO: ${secondYear}</div>
        <table>
          ${rightColumn || '<tr><td colspan="3" style="text-align: center; padding: 10px;">-</td></tr>'}
        </table>
      </div>
    </div>
    
    <div style="margin-top: 20px; padding-top: 10px; border-top: 1px solid #ddd;">
      <strong>Item:</strong> ${data.itemName}<br>
      <strong>Total:</strong> ${formatCurrency(data.totalValue)} em ${data.installments.length}x
    </div>
  </div>
</body>
</html>
  `.trim();
}
export function generateCardText(data) {
    const formatCurrency = (value) => `R$ ${value.toFixed(2).replace('.', ',')}`;
    let text = `*CONTROLE DE PARCELAS - Vani e Elo Joias*\n\n`;
    text += `Cliente: ${data.clientName}\n`;
    text += `Item: ${data.itemName}\n`;
    text += `Total: ${formatCurrency(data.totalValue)} em ${data.installments.length}x\n`;
    text += `Data: ${new Date(data.saleDate).toLocaleDateString('pt-BR')}\n\n`;
    text += `*PARCELAS:*\n`;
    data.installments.forEach(inst => {
        const month = new Date(inst.dueDate).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        const value = formatCurrency(inst.amount);
        const status = inst.paid ? '✅ PAGO' : '⏳ Pendente';
        text += `${inst.sequence}. ${month}: ${value} - ${status}\n`;
    });
    return text;
}
