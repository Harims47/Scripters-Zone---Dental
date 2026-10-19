import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileText, Download, Printer, ShieldCheck, Phone, MapPin } from 'lucide-react';
import { Button } from '../components/ui/button';
import { API_BASE_URL } from '../lib/api';

export function PublicDocumentViewPage() {
  const [searchParams] = useSearchParams();
  const type = (searchParams.get('type') || 'receipt').toLowerCase();
  const id = searchParams.get('id') || '';
  const token = searchParams.get('token') || '';
  const paymentId = searchParams.get('paymentId') || '';

  const [isLoading, setIsLoading] = useState(true);

  const docTitle =
    type === 'prescription'
      ? 'Prescription'
      : type === 'invoice'
      ? 'Tax Invoice'
      : 'Payment Receipt';

  const queryParams = new URLSearchParams({
    token,
    ...(paymentId ? { paymentId } : {}),
  });

  const pdfUrl = `${API_BASE_URL}/api/documents/public/${encodeURIComponent(type)}/${encodeURIComponent(id)}?${queryParams.toString()}`;

  const handleDownload = async () => {
    try {
      const response = await fetch(pdfUrl);
      if (!response.ok) throw new Error('Failed to download document');
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${type}_${id.substring(0, 8)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error(err);
      window.open(pdfUrl, '_blank');
    }
  };

  const handlePrint = () => {
    window.open(pdfUrl, '_blank');
  };

  if (!id || !token) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-slate-200">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Invalid Document Link</h2>
          <p className="text-sm text-slate-600 mb-6">
            This link is incomplete or has expired. Please contact the clinic for an updated document link.
          </p>
          <div className="p-4 bg-slate-50 rounded-xl text-xs text-slate-500 space-y-1 text-left">
            <p className="font-semibold text-slate-700">Rafi Dental Clinic</p>
            <p>📞 094430 23648</p>
            <p>📍 37, Dr.Venkatraman St, Gobichettipalayam</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 px-4 py-3 shadow-xs">
        <div className="max-w-5xl mx-auto flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
              <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                <path d="M12 2C8.5 2 6 4.5 6 7.5c0 2 .8 4.2 1.3 6.5.6 2.4 1.7 5.5 2.7 7.5.5 1 .9 1.5 1.5 1.5.5 0 .8-.4 1.1-.9.7-1.3 1.2-2.7 1.8-4.1.3-.8.7-1.5 1.1-2.3.4.8.8 1.5 1.1 2.3.6 1.4 1.1 2.8 1.8 4.1.3.5.6.9 1.1.9.6 0 1-.5 1.5-1.5 1-2 2.1-5.1 2.7-7.5.5-2.3 1.3-4.5 1.3-6.5C22 4.5 19.5 2 16 2h-4z" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 leading-tight">Rafi Dental Clinic</h1>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Official Document
                </span>
                <span>•</span>
                <span className="font-medium text-teal-700 capitalize">{docTitle}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="text-xs h-9 gap-1.5 border-slate-300 hover:bg-slate-50"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden sm:inline">Print / Open</span>
            </Button>
            <Button
              size="sm"
              onClick={handleDownload}
              className="text-xs h-9 gap-1.5 bg-teal-600 hover:bg-teal-700 text-white shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Document Frame */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 flex flex-col">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col min-h-[750px]">
          {isLoading && (
            <div className="p-8 text-center text-slate-400 my-auto">
              <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm">Loading your official {docTitle}...</p>
            </div>
          )}

          <iframe
            src={pdfUrl}
            title={docTitle}
            onLoad={() => setIsLoading(false)}
            className="w-full flex-1 border-0 rounded-2xl min-h-[750px]"
          />
        </div>

        {/* Footer Contact */}
        <footer className="mt-4 text-center text-xs text-slate-500 space-y-1">
          <p className="flex items-center justify-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-slate-400" /> 37, Dr.Venkatraman St, Gobichettipalayam, Tamil Nadu 638452
          </p>
          <p className="flex items-center justify-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-slate-400" /> Appointments & Queries: 094430 23648
          </p>
        </footer>
      </main>
    </div>
  );
}
