import { zodResolver } from '@hookform/resolvers/zod';
import { MessageSquarePlus, Paperclip } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { getErrorMessage } from '../api/errors';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/AsyncState';
import { StatusBadge } from '../components/ui/StatusBadge';
import { useComplaints, useCreateComplaint } from '../features/complaints/hooks';

const complaintSchema = z.object({ subject: z.string().min(5, 'Enter a clear subject.'), category: z.enum(['PRODUCT', 'QUALITY', 'DELIVERY', 'PAYMENT', 'RETURN', 'OTHER']), message: z.string().min(15, 'Describe the issue in at least 15 characters.') });
type ComplaintForm = z.infer<typeof complaintSchema>;

export function ComplaintsPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const complaints = useComplaints();
  const create = useCreateComplaint();
  const [showForm, setShowForm] = useState(Boolean(params.get('orderId')));
  const [files, setFiles] = useState<File[]>([]);
  const form = useForm<ComplaintForm>({ resolver: zodResolver(complaintSchema), defaultValues: { subject: '', category: 'PRODUCT', message: '' } });
  const submit = form.handleSubmit((values) => create.mutate({ ...values, relatedOrderId: params.get('orderId') ?? undefined, relatedOrderItemId: params.get('itemId') ?? undefined, attachments: files }, { onSuccess: (complaint) => void navigate(`/complaints/${complaint.id}`) }));
  return <div className="page shell"><div className="page-heading"><div><span className="eyebrow">Customer support</span><h1>Complaints</h1><p>Create and follow marketplace support requests.</p></div><button className="button button--primary" type="button" onClick={() => setShowForm((value) => !value)}><MessageSquarePlus size={17} /> New complaint</button></div>{showForm && <form className="support-form" onSubmit={(event) => void submit(event)}><div><h2>Create complaint</h2>{params.get('orderId') && <p>Linked to order <strong>#{params.get('orderId')}</strong>{params.get('itemId') ? ' and one order item' : ''}.</p>}</div><label>Subject<input {...form.register('subject')} />{form.formState.errors.subject && <small className="field-error">{form.formState.errors.subject.message}</small>}</label><label>Category<select {...form.register('category')}><option value="PRODUCT">Product</option><option value="QUALITY">Quality</option><option value="DELIVERY">Delivery</option><option value="PAYMENT">Payment</option><option value="RETURN">Return / refund</option><option value="OTHER">Other</option></select></label><label className="form-span">Message<textarea rows={5} {...form.register('message')} />{form.formState.errors.message && <small className="field-error">{form.formState.errors.message.message}</small>}</label><label className="file-field form-span"><Paperclip size={16} /> Attach supporting files<input type="file" accept="image/*,.pdf" multiple onChange={(event) => setFiles(Array.from(event.target.files ?? []))} /><small>{files.length ? `${files.length} file(s) selected` : 'Optional; backend validation applies.'}</small></label>{create.isError && <p className="form-error form-span">{getErrorMessage(create.error)}</p>}<div className="form-actions form-span"><button className="button button--secondary" type="button" onClick={() => setShowForm(false)}>Cancel</button><button className="button button--primary" disabled={create.isPending}>{create.isPending ? 'Submitting…' : 'Submit complaint'}</button></div></form>}{complaints.isLoading && <LoadingState label="Loading complaints" />}{complaints.isError && <ErrorState message={getErrorMessage(complaints.error)} onRetry={() => void complaints.refetch()} />}{complaints.data?.length === 0 && <EmptyState title="No complaints" message="Your support conversations will appear here." />}{complaints.data && complaints.data.length > 0 && <div className="complaint-list">{complaints.data.map((complaint) => <Link to={`/complaints/${complaint.id}`} key={complaint.id}><div><span>#{complaint.referenceNumber} · {complaint.category}</span><strong>{complaint.subject}</strong><small>Updated {new Date(complaint.updatedAt).toLocaleString('en-IN')}</small></div><StatusBadge status={complaint.status} /></Link>)}</div>}</div>;
}
