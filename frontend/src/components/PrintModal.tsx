import React from 'react';
import { Printer, X, ShieldCheck, HeartPulse, FileText } from 'lucide-react';
import { PatientProfile, DoctorProfile, Prescription, Billing } from '../types';
import { useAuth } from '../context/AuthContext';

interface PrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  type: 'prescription' | 'invoice' | 'patient' | 'doctor';
  data: any;
}

export const PrintModal: React.FC<PrintModalProps> = ({
  isOpen,
  onClose,
  title,
  type,
  data,
}) => {
  const { currency } = useAuth();
  if (!isOpen || !data) return null;

  const handlePrint = () => {
    window.print();
  };

  const renderContent = () => {
    switch (type) {
      case 'prescription': {
        const rx = data as Prescription;
        let items: any[] = [];
        try {
          items = JSON.parse(rx.details);
          if (!Array.isArray(items)) items = [];
        } catch {
          items = [];
        }

        return (
          <div className="printable-document bg-white p-8 rounded-xl border border-slate-200">
            {/* Header */}
            <div className="border-b-2 border-pharmacy-teal-600 pb-4 mb-6 flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 text-pharmacy-teal-700">
                  <HeartPulse className="w-7 h-7" />
                  <span className="text-2xl font-bold tracking-tight">PharmaLedger Medical Center</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">100 Health Avenue, Suite 400 • Phone: (555) 019-2834 • Rx License: #PH-9821</p>
              </div>
              <div className="text-right">
                <span className="inline-block bg-teal-50 text-pharmacy-teal-800 text-xs font-bold px-3 py-1 rounded-full uppercase border border-teal-200">
                  Official Prescription
                </span>
                <p className="text-xs text-slate-500 mt-2">Rx #{rx.id.toString().padStart(6, '0')}</p>
                <p className="text-xs text-slate-500 font-medium">Date: {new Date(rx.date).toLocaleDateString()}</p>
              </div>
            </div>

            {/* Doctor & Patient Info Cards */}
            <div className="grid grid-cols-2 gap-4 mb-6 bg-slate-50 p-4 rounded-lg border border-slate-100">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Prescribing Physician</p>
                <p className="text-base font-bold text-slate-900 mt-0.5">{rx.doctor?.name || 'Assigned Physician'}</p>
                <p className="text-xs text-pharmacy-teal-700 font-medium">{rx.doctor?.specialization || 'General Practitioner'}</p>
                <p className="text-xs text-slate-500 mt-0.5">License: {rx.doctor?.license_number || 'N/A'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Patient Information</p>
                <p className="text-base font-bold text-slate-900 mt-0.5">{rx.patient?.name || 'Patient'}</p>
                <p className="text-xs text-slate-600">
                  Age: {rx.patient?.age} • Gender: {rx.patient?.gender}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">Contact: {rx.patient?.contact || 'N/A'}</p>
              </div>
            </div>

            {/* Rx Symbol & Medication Table */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl font-serif font-black text-pharmacy-teal-800 italic">℞</span>
                <h4 className="text-sm font-bold uppercase tracking-wider text-slate-700">Prescribed Medication Regimen</h4>
              </div>

              {items.length > 0 ? (
                <table className="w-full text-left border-collapse border border-slate-200 text-sm">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 text-xs uppercase font-semibold">
                      <th className="p-2.5 border border-slate-200">#</th>
                      <th className="p-2.5 border border-slate-200">Medication</th>
                      <th className="p-2.5 border border-slate-200">Dosage</th>
                      <th className="p-2.5 border border-slate-200">Frequency</th>
                      <th className="p-2.5 border border-slate-200">Duration</th>
                      <th className="p-2.5 border border-slate-200">Instructions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50/50">
                        <td className="p-2.5 border border-slate-200 font-mono text-xs text-slate-400">{idx + 1}</td>
                        <td className="p-2.5 border border-slate-200 font-semibold text-slate-900">{item.medicine_name}</td>
                        <td className="p-2.5 border border-slate-200">{item.dosage}</td>
                        <td className="p-2.5 border border-slate-200">{item.frequency}</td>
                        <td className="p-2.5 border border-slate-200">{item.duration}</td>
                        <td className="p-2.5 border border-slate-200 text-xs text-slate-600">{item.instructions || 'As directed'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded text-sm text-slate-800 whitespace-pre-wrap">
                  {rx.details}
                </div>
              )}
            </div>

            {/* Signature Block */}
            <div className="pt-8 border-t border-slate-200 flex justify-between items-end mt-12">
              <div className="text-xs text-slate-400 space-y-1">
                <p className="flex items-center gap-1 font-medium text-slate-500">
                  <ShieldCheck className="w-4 h-4 text-pharmacy-teal-600" /> Digitally verified and recorded.
                </p>
                <p>This prescription is valid for 30 days from date of issuance.</p>
              </div>
              <div className="text-center w-56">
                <div className="border-b border-slate-400 pb-2 mb-1">
                  <span className="font-serif italic text-lg text-slate-700 font-semibold">
                    {rx.doctor?.name || 'Authorized Doctor'}
                  </span>
                </div>
                <p className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Doctor's Signature & Stamp</p>
              </div>
            </div>
          </div>
        );
      }

      case 'invoice': {
        const bill = data as Billing;
        return (
          <div className="printable-document bg-white p-8 rounded-xl border border-slate-200">
            {/* Header */}
            <div className="border-b-2 border-pharmacy-teal-600 pb-4 mb-6 flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 text-pharmacy-teal-700">
                  <HeartPulse className="w-7 h-7" />
                  <span className="text-2xl font-bold tracking-tight">PharmaLedger Clinic & Dispensary</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">Tax ID: 82-9382109 • 100 Health Ave • accounts@pharmaledger.com</p>
              </div>
              <div className="text-right">
                <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full uppercase border ${
                  bill.payment_status === 'PAID'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}>
                  Invoice: {bill.payment_status}
                </span>
                <p className="text-xs text-slate-500 mt-2 font-mono">INV-{bill.id.toString().padStart(6, '0')}</p>
                <p className="text-xs text-slate-500">Date: {new Date(bill.date).toLocaleDateString()}</p>
              </div>
            </div>

            {/* Bill To */}
            <div className="mb-6 bg-slate-50 p-4 rounded-lg border border-slate-100 flex justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Billed To</p>
                <p className="text-base font-bold text-slate-900 mt-0.5">{bill.patient?.name || 'Patient'}</p>
                <p className="text-xs text-slate-500">Patient ID: #{bill.patient_id}</p>
                <p className="text-xs text-slate-500">Contact: {bill.patient?.contact || 'N/A'}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Payment Terms</p>
                <p className="text-xs text-slate-700 mt-1">Due immediately upon receipt</p>
                <p className="text-xs text-slate-500">Payment method: Cash / Card / Insurance</p>
              </div>
            </div>

            {/* Line Items */}
            <table className="w-full text-left border-collapse border border-slate-200 text-sm mb-6">
              <thead>
                <tr className="bg-slate-100 text-slate-700 text-xs uppercase font-semibold">
                  <th className="p-3 border border-slate-200">Description</th>
                  <th className="p-3 border border-slate-200 text-center">Qty</th>
                  <th className="p-3 border border-slate-200 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-200">
                  <td className="p-3 border border-slate-200">
                    <p className="font-semibold text-slate-900">Pharmacy Medication & Clinical Dispensing</p>
                    <p className="text-xs text-slate-500">Prescription medicines, compounding, and clinical review fees</p>
                  </td>
                  <td className="p-3 border border-slate-200 text-center font-mono">1</td>
                  <td className="p-3 border border-slate-200 text-right font-mono font-medium">{currency}{bill.total_amount.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>

            {/* Total Block */}
            <div className="flex justify-end mb-8">
              <div className="w-64 space-y-2 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-mono">{currency}{bill.total_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Taxes (0% Medical):</span>
                  <span className="font-mono">{currency}0.00</span>
                </div>
                <div className="border-t border-slate-300 pt-2 flex justify-between text-base font-bold text-slate-900">
                  <span>Total Due:</span>
                  <span className="font-mono text-pharmacy-teal-800">{currency}{bill.total_amount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-6 border-t border-slate-200 text-center text-xs text-slate-400">
              <p>Thank you for choosing PharmaLedger for your healthcare needs.</p>
              <p className="mt-1">For billing inquiries, please contact accounts@pharmaledger.com</p>
            </div>
          </div>
        );
      }

      case 'patient': {
        const patient = data as PatientProfile;
        return (
          <div className="printable-document bg-white p-8 rounded-xl border border-slate-200">
            <div className="border-b-2 border-pharmacy-teal-600 pb-4 mb-6 flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-bold text-slate-900">{patient.name}</h3>
                <p className="text-xs text-slate-500">
                  Patient Profile Record • ID #{patient.id} • Registered: {new Date(patient.created_at).toLocaleDateString()}
                </p>
              </div>
              <span className="bg-teal-50 text-pharmacy-teal-800 text-xs font-bold px-3 py-1 rounded-full uppercase border border-teal-200">
                Active Patient
              </span>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6 bg-slate-50 p-4 rounded-lg border border-slate-100 text-sm">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase">Age</p>
                <p className="font-semibold text-slate-800 mt-0.5">{patient.age} years</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase">Gender</p>
                <p className="font-semibold text-slate-800 mt-0.5">{patient.gender}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase">Contact Number</p>
                <p className="font-semibold text-slate-800 mt-0.5">{patient.contact}</p>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Medical History & Allergies</h4>
              <div className="p-3.5 bg-rose-50/60 border border-rose-100 rounded-lg text-sm text-slate-800 leading-relaxed">
                {patient.medical_history || 'No recorded chronic conditions or drug allergies.'}
              </div>
            </div>

            {patient.appointments && patient.appointments.length > 0 && (
              <div className="mb-6">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Recent Clinical Appointments</h4>
                <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 text-slate-600 font-semibold uppercase">
                      <tr>
                        <th className="p-2">Date & Time</th>
                        <th className="p-2">Status</th>
                        <th className="p-2">Clinical Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {patient.appointments.map((a) => (
                        <tr key={a.id} className="border-t border-slate-100">
                          <td className="p-2 font-medium">{new Date(a.appointment_date).toLocaleString()}</td>
                          <td className="p-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                              {a.status}
                            </span>
                          </td>
                          <td className="p-2 text-slate-600">{a.notes || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      }

      case 'doctor': {
        const doctor = data as DoctorProfile;
        return (
          <div className="printable-document bg-white p-8 rounded-xl border border-slate-200">
            <div className="border-b-2 border-pharmacy-teal-600 pb-4 mb-6 flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-bold text-slate-900">{doctor.name}</h3>
                <p className="text-xs text-pharmacy-teal-700 font-medium">{doctor.specialization}</p>
              </div>
              <span className="bg-teal-50 text-pharmacy-teal-800 text-xs font-bold px-3 py-1 rounded-full uppercase border border-teal-200">
                Medical Staff
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6 bg-slate-50 p-4 rounded-lg border border-slate-100 text-sm">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase">License Number</p>
                <p className="font-mono font-semibold text-slate-800 mt-0.5">{doctor.license_number}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase">Contact Telephone</p>
                <p className="font-semibold text-slate-800 mt-0.5">{doctor.contact}</p>
              </div>
            </div>

            {doctor.appointments && doctor.appointments.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Scheduled Consultation Roster</h4>
                <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 text-slate-600 font-semibold uppercase">
                      <tr>
                        <th className="p-2">Date & Time</th>
                        <th className="p-2">Status</th>
                        <th className="p-2">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {doctor.appointments.map((a) => (
                        <tr key={a.id} className="border-t border-slate-100">
                          <td className="p-2 font-medium">{new Date(a.appointment_date).toLocaleString()}</td>
                          <td className="p-2">{a.status}</td>
                          <td className="p-2 text-slate-600">{a.notes || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      }

      default:
        return <div>No preview available</div>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Modal Toolbar (hidden during actual window.print) */}
        <div className="no-print flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-pharmacy-teal-600" />
            <h3 className="font-bold text-slate-800">{title}</h3>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-pharmacy-teal-600 hover:bg-pharmacy-teal-700 rounded-lg shadow-sm transition-colors"
            >
              <Printer className="w-4 h-4" />
              Print / Save as PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable View */}
        <div className="p-6 max-h-[80vh] overflow-y-auto">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};
