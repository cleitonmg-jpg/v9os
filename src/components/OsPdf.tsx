import React from 'react';
import { Document, Page, Text, View, StyleSheet, PDFViewer } from '@react-pdf/renderer';
import type { OSBudget, Empresa } from '../types';

const fmtCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (d: string) => new Date(d).toLocaleDateString('pt-BR');

const styles = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 9, padding: 32, backgroundColor: '#fff', color: '#1e293b' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, borderBottom: '2px solid #356682', paddingBottom: 12 },
  companyName: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#356682' },
  companyInfo: { fontSize: 8, color: '#64748b', marginTop: 2 },
  docTitle: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#1e293b', textAlign: 'right' },
  docNumber: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: '#356682', textAlign: 'right' },
  section: { marginBottom: 14 },
  sectionTitle: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#356682', textTransform: 'uppercase', letterSpacing: 1, borderBottom: '1px solid #e2e8f0', paddingBottom: 4, marginBottom: 8 },
  row2: { flexDirection: 'row', gap: 16 },
  field: { flex: 1 },
  label: { fontSize: 7, color: '#94a3b8', fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', marginBottom: 2 },
  value: { fontSize: 9, color: '#1e293b' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f1f7f9', borderRadius: 4, padding: '6 8', marginBottom: 2 },
  tableRow: { flexDirection: 'row', padding: '5 8', borderBottom: '1px solid #f1f5f9' },
  col1: { flex: 4 },
  col2: { flex: 1, textAlign: 'center' },
  col3: { flex: 1, textAlign: 'center' },
  col4: { flex: 1.5, textAlign: 'right' },
  col5: { flex: 1.5, textAlign: 'right' },
  col6: { flex: 2 },
  th: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#64748b', textTransform: 'uppercase' },
  td: { fontSize: 8.5, color: '#334155' },
  totalRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8, paddingTop: 8, borderTop: '2px solid #356682' },
  totalLabel: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#356682', marginRight: 12 },
  totalValue: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#1e293b' },
  statusBadge: { padding: '3 8', borderRadius: 4, alignSelf: 'flex-start' },
  footer: { position: 'absolute', bottom: 24, left: 32, right: 32, textAlign: 'center', fontSize: 7, color: '#94a3b8', borderTop: '1px solid #e2e8f0', paddingTop: 8 },
  defectBox: { backgroundColor: '#fefce8', border: '1px solid #fde047', borderRadius: 4, padding: 8, marginTop: 4 },
  notesBox: { backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 4, padding: 8, marginTop: 4 },
});

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Aberto', IN_PROGRESS: 'Em Andamento', WAITING: 'Aguard. Aprovação',
  COMPLETED: 'Concluído', CANCELLED: 'Cancelado',
};

interface Props { os: OSBudget; empresa?: Partial<Empresa> | null; }

const OsDocument: React.FC<Props> = ({ os, empresa }) => {
  const nomeEmpresa = empresa?.nome || 'Oficina';
  const telefone = empresa?.telefone || '';
  const endereco = empresa?.endereco || '';
  const cnpj = empresa?.cnpj || '';
  const email = empresa?.email || '';

  const footerParts = [nomeEmpresa, telefone, email].filter(Boolean);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.companyName}>{nomeEmpresa}</Text>
            {cnpj ? <Text style={styles.companyInfo}>CNPJ: {cnpj}</Text> : null}
            {endereco ? <Text style={styles.companyInfo}>{endereco}</Text> : null}
            {telefone ? <Text style={styles.companyInfo}>{telefone}</Text> : null}
            {email ? <Text style={styles.companyInfo}>{email}</Text> : null}
          </View>
          <View>
            <Text style={styles.docTitle}>{os.type === 'BUDGET' ? 'ORÇAMENTO' : 'ORDEM DE SERVIÇO'}</Text>
            <Text style={styles.docNumber}>#{String(os.number).padStart(4, '0')}</Text>
            <Text style={{ fontSize: 8, color: '#64748b', textAlign: 'right', marginTop: 2 }}>{fmtDate(os.date)}</Text>
            <Text style={{ fontSize: 8, color: '#356682', textAlign: 'right', fontFamily: 'Helvetica-Bold', marginTop: 2 }}>
              {STATUS_LABELS[os.status] || os.status}
            </Text>
          </View>
        </View>

        {/* Client & Vehicle */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dados do Cliente & Veículo</Text>
          <View style={styles.row2}>
            <View style={styles.field}>
              <Text style={styles.label}>Cliente</Text>
              <Text style={styles.value}>{os.client?.name || '—'}</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>CPF / CNPJ</Text>
              <Text style={styles.value}>{os.client?.cpfCnpj || '—'}</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Telefone</Text>
              <Text style={styles.value}>{os.client?.phone || '—'}</Text>
            </View>
          </View>
          <View style={[styles.row2, { marginTop: 8 }]}>
            <View style={styles.field}>
              <Text style={styles.label}>Veículo</Text>
              <Text style={styles.value}>{os.vehicle ? `${os.vehicle.brand} ${os.vehicle.model}` : '—'}</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Placa</Text>
              <Text style={styles.value}>{os.vehicle?.plate || '—'}</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Ano / Cor</Text>
              <Text style={styles.value}>{os.vehicle ? `${os.vehicle.year} / ${os.vehicle.color}` : '—'}</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Quilometragem</Text>
              <Text style={styles.value}>{os.vehicle ? `${os.vehicle.mileage.toLocaleString()} km` : '—'}</Text>
            </View>
          </View>
        </View>

        {/* Defects */}
        {os.type === 'OS' && os.defectReported && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Defeitos Relatados</Text>
            <View style={styles.defectBox}>
              <Text style={{ fontSize: 9, color: '#713f12' }}>{os.defectReported}</Text>
            </View>
          </View>
        )}

        {/* Items ou Recebimento */}
        {os.items.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Serviços & Peças</Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.th, styles.col1]}>Descrição</Text>
              <Text style={[styles.th, styles.col2]}>Tipo</Text>
              <Text style={[styles.th, styles.col3]}>Qtd</Text>
              <Text style={[styles.th, styles.col4]}>Vlr Unit.</Text>
              <Text style={[styles.th, styles.col5]}>Total</Text>
              {os.type === 'OS' && <Text style={[styles.th, styles.col6]}>Técnico</Text>}
            </View>
            {os.items.map((item, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={[styles.td, styles.col1]}>{item.description}</Text>
                <Text style={[styles.td, styles.col2]}>{item.type === 'SERVICE' ? 'Serviço' : 'Peça'}</Text>
                <Text style={[styles.td, styles.col3]}>{item.quantity}</Text>
                <Text style={[styles.td, styles.col4]}>{fmtCurrency(item.unitPrice)}</Text>
                <Text style={[styles.td, styles.col5]}>{fmtCurrency(item.totalPrice)}</Text>
                {os.type === 'OS' && <Text style={[styles.td, styles.col6]}>{item.technician?.name || '—'}</Text>}
              </View>
            ))}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>TOTAL</Text>
              <Text style={styles.totalValue}>{fmtCurrency(os.totalAmount)}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Comprovante de Recebimento</Text>
            <View style={{ backgroundColor: '#f1f7f9', borderRadius: 4, padding: 12, border: '1px solid #bdd9e4' }}>
              <Text style={{ fontSize: 9, color: '#293d4e', lineHeight: 1.6 }}>
                Declaro que entreguei o veículo {os.vehicle ? `${os.vehicle.brand} ${os.vehicle.model}, placa ${os.vehicle.plate}, ano ${os.vehicle.year}` : 'identificado acima'}, para avaliação e serviços em {nomeEmpresa}, nas condições e com os defeitos descritos neste documento.
              </Text>
              <Text style={{ fontSize: 9, color: '#293d4e', marginTop: 8 }}>
                Data de entrada: {fmtDate(os.date)}
              </Text>
            </View>
          </View>
        )}

        {/* Notes */}
        {os.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Observações</Text>
            <View style={styles.notesBox}>
              <Text style={{ fontSize: 9, color: '#475569' }}>{os.notes}</Text>
            </View>
          </View>
        )}

        {/* Assinaturas — apenas na OS */}
        {os.type === 'OS' && (
          <View style={{ marginTop: 40, flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <View style={{ height: 36 }} />
              <View style={{ borderTop: '1px solid #94a3b8', width: 180, marginBottom: 4 }} />
              <Text style={{ fontSize: 8, color: '#64748b' }}>Assinatura do Cliente</Text>
              <Text style={{ fontSize: 7, color: '#94a3b8', marginTop: 2 }}>{os.client?.name || ''}</Text>
            </View>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <View style={{ height: 36 }} />
              <View style={{ borderTop: '1px solid #94a3b8', width: 180, marginBottom: 4 }} />
              <Text style={{ fontSize: 8, color: '#64748b' }}>Responsável pela Oficina</Text>
              <Text style={{ fontSize: 7, color: '#94a3b8', marginTop: 2 }}>{nomeEmpresa}</Text>
            </View>
          </View>
        )}

        <Text style={styles.footer}>
          {footerParts.join(' · ')} · Documento gerado em {fmtDate(new Date().toISOString())}
        </Text>
      </Page>
    </Document>
  );
};

export const OsPdf: React.FC<Props> = ({ os, empresa }) => (
  <PDFViewer width="100%" height={600} className="rounded-xl border border-slate-200">
    <OsDocument os={os} empresa={empresa} />
  </PDFViewer>
);
