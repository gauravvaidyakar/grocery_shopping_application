import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, MessageSquare, RotateCcw, Star, X } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { getErrorMessage } from '../../api/errors';
import type { OrderItem } from '../../api/types';
import { useCancelOrderItem, useCreateReturn, useCreateReview, useUpdateReview } from '../../features/orders/hooks';
import { StatusBadge } from '../ui/StatusBadge';

type ActionMode = 'cancel' | 'return' | 'review' | null;
const reasonSchema = z.object({ reason: z.string().min(5, 'Please give a short reason.') });
const returnSchema = z.object({ reason: z.string().min(10, 'Describe the issue in at least 10 characters.'), resolution: z.enum(['REFUND', 'REPLACEMENT']) });
const reviewSchema = z.object({ rating: z.number().min(1).max(5), comment: z.string().min(10, 'Write at least 10 characters.') });

export function OrderItemActions({ orderId, item }: { orderId: string; item: OrderItem }) {
  const [mode, setMode] = useState<ActionMode>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [reviewImages, setReviewImages] = useState<File[]>([]);
  const cancel = useCancelOrderItem(orderId);
  const createReturn = useCreateReturn(orderId);
  const createReview = useCreateReview(orderId);
  const updateReview = useUpdateReview(orderId);
  const cancelForm = useForm<z.infer<typeof reasonSchema>>({ resolver: zodResolver(reasonSchema), defaultValues: { reason: '' } });
  const returnForm = useForm<z.infer<typeof returnSchema>>({ resolver: zodResolver(returnSchema), defaultValues: { reason: '', resolution: 'REPLACEMENT' } });
  const reviewForm = useForm<z.infer<typeof reviewSchema>>({ resolver: zodResolver(reviewSchema), defaultValues: { rating: 5, comment: '' } });
  const close = () => setMode(null);
  const editReview = () => {
    reviewForm.reset({ rating: item.review?.rating ?? 5, comment: item.review?.comment ?? '' });
    setMode('review');
  };
  const submitReview = reviewForm.handleSubmit(({ rating, comment }) => {
    if (item.review) updateReview.mutate({ reviewId: item.review.id, input: { rating, comment, imageFiles: reviewImages } }, { onSuccess: close });
    else createReview.mutate({ productId: item.productId, input: { orderItemId: item.id, rating, comment, imageFiles: reviewImages } }, { onSuccess: close });
  });

  return <div className="item-actions">
    {item.returnRequest && <div className="action-status"><span>Return / {item.returnRequest.resolution.toLowerCase()}</span><StatusBadge status={item.returnRequest.status} /><small>{item.returnRequest.statusMessage}</small></div>}
    {item.review && <div className="action-status"><span>Review · {item.review.rating}/5</span><StatusBadge status={item.review.status} /></div>}
    <div className="item-action-buttons">
      {item.actions.canCancel && <button type="button" onClick={() => setMode('cancel')}><X size={15} /> Cancel item</button>}
      {item.actions.canReturn && <button type="button" onClick={() => setMode('return')}><RotateCcw size={15} /> Return / quality issue</button>}
      {item.actions.canReview && <button type="button" onClick={() => setMode('review')}><Star size={15} /> Review product</button>}
      {item.review && <button type="button" onClick={editReview}><Star size={15} /> Edit review</button>}
      {item.actions.canRaiseComplaint && <Link to={`/complaints?orderId=${encodeURIComponent(orderId)}&itemId=${encodeURIComponent(item.id)}`}><MessageSquare size={15} /> Raise complaint</Link>}
    </div>
    {mode === 'cancel' && <form className="inline-action-form" onSubmit={(event) => void cancelForm.handleSubmit(({ reason }) => cancel.mutate({ itemId: item.id, input: { reason } }, { onSuccess: close }))(event)}>
      <h4>Cancel only this item</h4><p>Other vendors and items in the master order will not be cancelled.</p><textarea aria-label="Cancellation reason" placeholder="Reason for cancellation" {...cancelForm.register('reason')} />
      {cancelForm.formState.errors.reason && <small className="field-error">{cancelForm.formState.errors.reason.message}</small>}{cancel.isError && <p className="form-error">{getErrorMessage(cancel.error)}</p>}
      <div><button className="button button--secondary" type="button" onClick={close}>Keep item</button><button className="button button--danger" disabled={cancel.isPending}>Confirm item cancellation</button></div>
    </form>}
    {mode === 'return' && <form className="inline-action-form" onSubmit={(event) => void returnForm.handleSubmit(({ reason, resolution }) => createReturn.mutate({ itemId: item.id, input: { reason, resolution, attachments: files } }, { onSuccess: close }))(event)}>
      <h4>Report a quality issue</h4><p>Eligibility and any refund amount are decided by the backend.</p><label>Preferred resolution<select {...returnForm.register('resolution')}><option value="REPLACEMENT">Replacement</option><option value="REFUND">Refund</option></select></label><textarea aria-label="Return reason" placeholder="Describe the quality issue" {...returnForm.register('reason')} />
      <label className="file-field">Supporting images/files<input type="file" accept="image/*,.pdf" multiple onChange={(event) => setFiles(Array.from(event.target.files ?? []))} /><small>{files.length ? `${files.length} file(s) selected` : 'Optional; backend file rules apply.'}</small></label>
      {returnForm.formState.errors.reason && <small className="field-error">{returnForm.formState.errors.reason.message}</small>}{createReturn.isError && <p className="form-error">{getErrorMessage(createReturn.error)}</p>}
      <div><button className="button button--secondary" type="button" onClick={close}>Cancel</button><button className="button button--primary" disabled={createReturn.isPending}>Submit request</button></div>
    </form>}
    {mode === 'review' && <form className="inline-action-form" onSubmit={(event) => void submitReview(event)}>
      <h4>{item.review ? 'Edit your review' : 'Review your verified purchase'}</h4><label>Rating<select {...reviewForm.register('rating', { valueAsNumber: true })}><option value="5">5 — Excellent</option><option value="4">4 — Good</option><option value="3">3 — Average</option><option value="2">2 — Poor</option><option value="1">1 — Very poor</option></select></label><textarea aria-label="Review comment" placeholder="Share your experience" {...reviewForm.register('comment')} />
      <label className="file-field">Review photos<input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => setReviewImages(Array.from(event.target.files ?? []).slice(0, 3))} /><small>{reviewImages.length ? `${reviewImages.length} photo(s) selected` : 'Optional; up to 3 JPG, PNG or WEBP images.'}</small></label>
      {reviewForm.formState.errors.comment && <small className="field-error">{reviewForm.formState.errors.comment.message}</small>}{(createReview.isError || updateReview.isError) && <p className="form-error">{getErrorMessage(createReview.error ?? updateReview.error)}</p>}
      <div><button className="button button--secondary" type="button" onClick={close}>Cancel</button><button className="button button--primary" disabled={createReview.isPending || updateReview.isPending}>{item.review ? 'Save review' : 'Submit review'}</button></div>
    </form>}
    {!item.actions.canReturn && item.actions.returnIneligibleReason && !item.returnRequest && <span className="eligibility-note"><AlertCircle size={14} /> {item.actions.returnIneligibleReason}</span>}
  </div>;
}
