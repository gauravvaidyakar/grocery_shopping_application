import { ArrowLeft, Send } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getErrorMessage } from '../api/errors';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/AsyncState';
import { StatusBadge } from '../components/ui/StatusBadge';
import { useAddComplaintMessage, useComplaint } from '../features/complaints/hooks';

export function ComplaintDetailsPage() {
  const { complaintId = '' } = useParams();
  const complaint = useComplaint(complaintId);
  const addMessage = useAddComplaintMessage(complaintId);
  const [message, setMessage] = useState('');
  if (complaint.isLoading) return <div className="page shell"><LoadingState label="Loading complaint" /></div>;
  if (complaint.isError) return <div className="page shell"><ErrorState message={getErrorMessage(complaint.error)} onRetry={() => void complaint.refetch()} /></div>;
  if (!complaint.data) return <div className="page shell"><EmptyState title="Complaint not found" message="This support request is unavailable." /></div>;
  const value = complaint.data;
  const send = () => { const clean = message.trim(); if (!clean) return; addMessage.mutate(clean, { onSuccess: () => setMessage('') }); };
  return <div className="page shell support-thread"><Link className="back-link" to="/complaints"><ArrowLeft size={17} /> Back to complaints</Link><header><div><span>#{value.referenceNumber} · {value.category}</span><h1>{value.subject}</h1>{value.relatedOrderId && <Link to={`/orders/${value.relatedOrderId}`}>Related order #{value.relatedOrderId}</Link>}</div><StatusBadge status={value.status} /></header><div className="message-thread">{value.messages.map((entry) => <article className={entry.author === 'CUSTOMER' ? 'customer-message' : 'support-message'} key={entry.id}><strong>{entry.author === 'CUSTOMER' ? 'You' : 'Vishwaneed support'}</strong><p>{entry.message}</p><time>{new Date(entry.createdAt).toLocaleString('en-IN')}</time></article>)}</div>{value.attachmentNames.length > 0 && <p className="attachment-note">Attachments: {value.attachmentNames.join(', ')}</p>}{value.status !== 'CLOSED' && <div className="message-composer"><label htmlFor="complaint-reply">Reply to support</label><textarea id="complaint-reply" rows={3} value={message} onChange={(event) => setMessage(event.target.value)} /><button className="button button--primary" type="button" disabled={!message.trim() || addMessage.isPending} onClick={send}><Send size={16} /> Send reply</button>{addMessage.isError && <p className="form-error">{getErrorMessage(addMessage.error)}</p>}</div>}</div>;
}
