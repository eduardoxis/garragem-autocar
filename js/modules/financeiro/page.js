import { createCrudPage } from '../crud-page.js';
import { currency } from '../../utils/currency.js';

const isSettled = item => item.status === 'Pago' || item.status === 'Recebido';
const isIncome = item => ['Receita','Conta a receber'].includes(item.type);
const isCurrentMonth = item => {
  const value = item.paidAt || item.dueDate || item.createdAt;
  const date = value?.toDate ? value.toDate() : new Date(value || 0);
  const now = new Date();
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
};

createCrudPage({
  title:'Financeiro',active:'financeiro',collection:'payments',singular:'lançamento',titleKey:'description',newLabel:'Novo lançamento',adminOnly:true,pageSize:1000,
  subtitle:'Controle receitas, despesas, contas a pagar e receber.',searchKeys:['description','category','customerName'],
  summary:records => {
    const month = records.filter(isCurrentMonth);
    const income = month.filter(item => isIncome(item) && isSettled(item)).reduce((sum,item) => sum + Number(item.amount || 0), 0);
    const expense = month.filter(item => !isIncome(item) && isSettled(item)).reduce((sum,item) => sum + Number(item.amount || 0), 0);
    const pending = records.filter(item => !isSettled(item) && item.status !== 'Cancelado').reduce((sum,item) => sum + Number(item.amount || 0), 0);
    return `<article class="card stat-card"><span class="stat-icon">+</span><div><small>Receitas do mês</small><strong>${currency(income)}</strong></div></article><article class="card stat-card"><span class="stat-icon">−</span><div><small>Despesas do mês</small><strong>${currency(expense)}</strong></div></article><article class="card stat-card"><span class="stat-icon">=</span><div><small>Saldo do mês</small><strong>${currency(income - expense)}</strong></div></article><article class="card stat-card"><span class="stat-icon">!</span><div><small>Pendente</small><strong>${currency(pending)}</strong></div></article>`;
  },
  columns:[{key:'description',label:'Descrição'},{key:'type',label:'Tipo',render:value=>`<span class="badge ${value==='Receita'?'badge-success':'badge-danger'}">${value}</span>`},{key:'dueDate',label:'Vencimento'},{key:'status',label:'Status'},{key:'amount',label:'Valor',render:currency}],
  fields:[{key:'description',label:'Descrição',required:true},{key:'type',label:'Tipo',type:'select',options:['Receita','Despesa','Conta a receber','Conta a pagar']},{key:'category',label:'Categoria'},{key:'customerName',label:'Cliente/Fornecedor'},{key:'amount',label:'Valor',type:'number',required:true},{key:'dueDate',label:'Vencimento',type:'date'},{key:'paidAt',label:'Pagamento',type:'date'},{key:'paymentMethod',label:'Forma de pagamento',type:'select',options:['Dinheiro','PIX','Crédito','Débito','Boleto','Transferência']},{key:'status',label:'Status',type:'select',options:['Pendente','Pago','Atrasado','Cancelado']},{key:'notes',label:'Observações',type:'textarea',full:true}],
  normalize:data=>({...data,amount:Number(data.amount)||0})
});
