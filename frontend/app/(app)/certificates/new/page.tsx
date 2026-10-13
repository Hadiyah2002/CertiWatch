import CertificateForm from '@/components/certificates/CertificateForm';

export default function NewCertificatePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">New Certificate</h1>
        <p className="mt-1 text-sm text-gray-500">Add a new government certificate or compliance document.</p>
      </div>
      <CertificateForm mode="create" />
    </div>
  );
}
