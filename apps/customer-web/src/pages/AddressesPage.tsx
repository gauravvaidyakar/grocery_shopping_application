import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Edit3, MapPin, Plus, Trash2, X } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { marketplaceApi } from '../api';
import type { Address, AddressInput } from '../api/types';
import { getErrorMessage } from '../api/errors';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/AsyncState';
import { FormField } from '../components/ui/FormField';

export const addressesKey = ['customer-addresses'] as const;
const addressSchema = z.object({ label: z.enum(['HOME', 'WORK', 'OTHER']), recipientName: z.string().min(2, 'Enter the recipient name.'), mobile: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number.'), line1: z.string().min(5, 'Enter the house/building and street.'), line2: z.string().optional(), landmark: z.string().optional(), city: z.string().min(2, 'Enter the city.'), state: z.string().min(2, 'Enter the state.'), pincode: z.string().regex(/^\d{6}$/, 'Enter a valid 6-digit pincode.'), isDefault: z.boolean() });
type AddressForm = z.infer<typeof addressSchema>;
const emptyAddress: AddressForm = { label: 'HOME', recipientName: '', mobile: '', line1: '', line2: '', landmark: '', city: '', state: '', pincode: '', isDefault: false };

function AddressEditor({ address, onClose }: { address?: Address; onClose: () => void }) {
  const queryClient = useQueryClient();
  const form = useForm<AddressForm>({ resolver: zodResolver(addressSchema), defaultValues: address ? { ...address } : emptyAddress });
  const mutation = useMutation({
    mutationFn: (input: AddressInput) => address ? marketplaceApi.updateAddress(address.id, input) : marketplaceApi.createAddress(input),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: addressesKey }); onClose(); },
  });
  const submit = form.handleSubmit((values) => mutation.mutate(values));
  return <div className="address-editor"><div className="editor-head"><div><span className="eyebrow">Delivery details</span><h2>{address ? 'Edit address' : 'Add a new address'}</h2></div><button className="icon-button" type="button" aria-label="Close address form" onClick={onClose}><X /></button></div><form className="address-form" onSubmit={(event) => void submit(event)} noValidate><label className="form-field"><span>Address label</span><select {...form.register('label')}><option value="HOME">Home</option><option value="WORK">Work</option><option value="OTHER">Other</option></select></label><FormField label="Recipient name" autoComplete="name" registration={form.register('recipientName')} error={form.formState.errors.recipientName} /><FormField label="Mobile number" inputMode="numeric" autoComplete="tel" registration={form.register('mobile')} error={form.formState.errors.mobile} /><FormField label="House / building / street" autoComplete="address-line1" registration={form.register('line1')} error={form.formState.errors.line1} /><FormField label="Area / locality (optional)" autoComplete="address-line2" registration={form.register('line2')} error={form.formState.errors.line2} /><FormField label="Landmark (optional)" registration={form.register('landmark')} error={form.formState.errors.landmark} /><FormField label="City" autoComplete="address-level2" registration={form.register('city')} error={form.formState.errors.city} /><FormField label="State" autoComplete="address-level1" registration={form.register('state')} error={form.formState.errors.state} /><FormField label="Pincode" inputMode="numeric" autoComplete="postal-code" registration={form.register('pincode')} error={form.formState.errors.pincode} /><label className="checkbox-field form-span"><input type="checkbox" {...form.register('isDefault')} /> Make this my default delivery address</label>{mutation.isError && <p className="form-error form-span" role="alert">{getErrorMessage(mutation.error)}</p>}<div className="form-actions form-span"><button className="button button--secondary" type="button" onClick={onClose}>Cancel</button><button className="button button--primary" disabled={mutation.isPending}>{mutation.isPending ? 'Saving…' : 'Save address'}</button></div></form></div>;
}

export function AddressesPage() {
  const [editing, setEditing] = useState<Address | 'new' | null>(null);
  const queryClient = useQueryClient();
  const addresses = useQuery({ queryKey: addressesKey, queryFn: () => marketplaceApi.getAddresses() });
  const remove = useMutation({ mutationFn: (id: string) => marketplaceApi.deleteAddress(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: addressesKey }) });
  return <div className="page shell"><div className="page-heading"><div><span className="eyebrow">Your account</span><h1>Delivery addresses</h1><p>Choose where you want your marketplace orders delivered.</p></div><button className="button button--primary" type="button" onClick={() => setEditing('new')}><Plus size={18} /> Add address</button></div>{addresses.isLoading && <LoadingState label="Loading addresses" />}{addresses.isError && <ErrorState message={getErrorMessage(addresses.error)} onRetry={() => void addresses.refetch()} />}{addresses.data?.length === 0 && <EmptyState title="No addresses saved" message="Add a delivery address to continue to checkout." />}{addresses.data && <div className="address-grid">{addresses.data.map((address) => <article className={`address-card ${address.isDefault ? 'is-default' : ''}`} key={address.id}><div className="address-card-top"><span className="address-label"><MapPin size={16} /> {address.label}</span>{address.isDefault && <span className="default-badge"><Check size={14} /> Default</span>}</div><h2>{address.recipientName}</h2><p>{address.line1}{address.line2 ? `, ${address.line2}` : ''}</p><p>{address.city}, {address.state} — {address.pincode}</p><p>+91 {address.mobile}</p><div className="address-actions"><button type="button" onClick={() => setEditing(address)}><Edit3 size={16} /> Edit</button><button type="button" disabled={remove.isPending} onClick={() => remove.mutate(address.id)}><Trash2 size={16} /> Delete</button></div></article>)}</div>}{editing && <AddressEditor address={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}</div>;
}
