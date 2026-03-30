'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  getAllCustomers,
  addCustomer,
  updateCustomer,
  deleteCustomer,
} from '@/firebase/firestore';
import { registerCustomer, signInWithCustomToken } from '@/firebase/auth';
import { auth } from '@/firebase/firebaseConfig';
import { validatePhone } from '@/lib/validations';

export default function CustomersPage() {
  const { t } = useTranslation();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    password: '',
    isAdmin: false,
  });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [impersonating, setImpersonating] = useState(false);

  useEffect(() => {
    fetchCustomers();
    // Check if already impersonating on mount (shouldn't happen but safe)
    setImpersonating(sessionStorage.getItem('isImpersonating') === 'true');
  }, []);

  const fetchCustomers = async () => {
    try {
      const result = await getAllCustomers();
      if (result.success) {
        setCustomers(result.customers);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }

    if (!validatePhone(formData.phone)) {
      setError('Please enter a valid 10-digit Indian phone number');
      return;
    }

    if (!editingCustomer && !formData.password) {
      setError('Password is required for new customers');
      return;
    }

    if (formData.password && formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      let result;

      if (editingCustomer) {
        result = await updateCustomer(editingCustomer.id, {
          name: formData.name,
          phone: formData.phone,
          isAdmin: formData.isAdmin,
        });

        if (result.success) {
          setMessage('Customer updated successfully');
        }
      } else {
        // First create Firebase Auth user
        const authResult = await registerCustomer(
          formData.phone,
          formData.password,
          formData.name
        );

        if (!authResult.success) {
          setError('Failed to create authentication user: ' + authResult.message);
          return;
        }

        // Then create customer record with userId
        result = await addCustomer({
          name: formData.name,
          phone: formData.phone,
          userId: authResult.user.uid,
          isAdmin: formData.isAdmin,
        });

        if (result.success) {
          setMessage('Customer added successfully');
        } else {
          // If Firestore fails, clean up the auth user to maintain consistency
          try {
            await authResult.user.delete();
          } catch (deleteError) {
            console.error('Failed to cleanup auth user after Firestore error:', deleteError);
          }
          setError('Failed to create customer profile: ' + (result.error || 'Unknown error'));
        }
      }

      if (result.success) {
        fetchCustomers();
        resetForm();
        setTimeout(() => setMessage(''), 3000);
      } else {
        setError(result.error || 'Failed to save customer');
      }
    } catch (err) {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone,
      password: '',
      isAdmin: customer.isAdmin || false,
    });
    setShowModal(true);
  };

  const handleDelete = async (customerId) => {
    if (!confirm('Are you sure you want to delete this customer?')) return;

    const result = await deleteCustomer(customerId);
    if (result.success) {
      fetchCustomers();
    } else {
      alert('Failed to delete customer: ' + result.error);
    }
  };

  const resetForm = () => {
    setEditingCustomer(null);
    setFormData({
      name: '',
      phone: '',
      password: '',
      isAdmin: false,
    });
    setShowModal(false);
    setError('');
    setMessage('');
  };

  const handleImpersonate = async (customer) => {
    setError('');

    // Check if customer has a userId (required for impersonation)
    if (!customer.userId) {
      setError('Cannot impersonate this customer: no user account linked');
      return;
    }

    try {
      // Get current user's ID token
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setError('You must be logged in as admin to impersonate');
        return;
      }

      const idToken = await currentUser.getIdToken();

      // Call API to get custom token for customer
      const response = await fetch('/api/admin/impersonate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ customerUserId: customer.userId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to impersonate customer');
      }

      // Store original admin info for switch back BEFORE signing in
      // This ensures the ClientLayout sees the flag when auth state changes
      sessionStorage.setItem('originalAdminUid', currentUser.uid);
      // Also store phone for fallback lookup
      const email = currentUser.email;
      if (email) {
        const phone = email.split('@')[0];
        sessionStorage.setItem('originalAdminPhone', phone);
      }
      sessionStorage.setItem('isImpersonating', 'true');

      // Sign in with the custom token
      await signInWithCustomToken(auth, data.customToken);

      setImpersonating(true);

      alert(`Now logged in as ${customer.name}. Use the "Switch back to Admin" button to return.`);
    } catch (err) {
      setError('Failed to login as customer: ' + err.message);
      console.error('Impersonation error:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{t('Customers')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage customer accounts</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          <span>{t('addCustomer')}</span>
        </button>
      </div>

      {message && (
        <div className="alert alert-success" role="alert">
          {message}
        </div>
      )}

      <div className="card">
        {loading ? (
          <div className="empty-state">
            <div className="spinner-lg mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">{t('loading')}</p>
          </div>
        ) : customers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="empty-state-title">No customers yet</h3>
            <p className="empty-state-description">Get started by adding your first customer.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="table">
                <thead className="table-head">
                  <tr>
                    <th>{t('name')}</th>
                    <th>{t('phone')}</th>
                    <th>Role</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => (
                    <tr key={customer.id} className="table-row">
                      <td className="font-semibold text-gray-900 dark:text-gray-100">
                        {customer.name}
                      </td>
                      <td className="text-gray-600 dark:text-gray-300">
                        {customer.phone}
                      </td>
                      <td>
                        {customer.isAdmin ? (
                          <span className="badge badge-error">Admin</span>
                        ) : (
                          <span className="badge badge-success">Customer</span>
                        )}
                      </td>
                      <td className="text-right">
                        <div className="flex justify-end gap-2">
                          {/* Call Button */}
                          <a
                            href={`tel:${customer.phone}`}
                            className="inline-flex items-center justify-center text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 font-medium text-sm px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                            title="Call customer"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                          </a>

                          {/* WhatsApp Button */}
                          <a
                            href={`https://wa.me/91${customer.phone}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-medium text-sm px-2 py-1 rounded hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                            title="Send WhatsApp message"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                            </svg>
                          </a>

                          <button
                            onClick={() => handleImpersonate(customer)}
                            disabled={impersonating || !customer.userId}
                            className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 font-medium text-sm px-2 py-1 rounded hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title={customer.userId ? "Login as this customer" : "No user account linked"}
                          >
                            Login as
                          </button>
                          <button
                            onClick={() => handleEdit(customer)}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 font-medium text-sm px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                          >
                            {t('edit')}
                          </button>
                          <button
                            onClick={() => handleDelete(customer.id)}
                            className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 font-medium text-sm px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          >
                            {t('delete')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {customers.map((customer) => (
                <div key={customer.id} className="card p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-lg">
                        {customer.name}
                      </h3>
                      <div className="mt-1">
                        {customer.isAdmin ? (
                          <span className="badge badge-error text-xs">Admin</span>
                        ) : (
                          <span className="badge badge-success text-xs">Customer</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm mb-3">
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Phone:</span>
                      <span className="text-gray-900 dark:text-gray-100 font-medium">{customer.phone}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <a
                      href={`tel:${customer.phone}`}
                      className="inline-flex items-center px-3 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-sm font-medium rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                      title="Call customer"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      Call
                    </a>
                    <a
                      href={`https://wa.me/91${customer.phone}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-3 py-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-sm font-medium rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                      title="Send WhatsApp message"
                    >
                      <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                      WhatsApp
                    </a>
                    {customer.userId && (
                      <button
                        onClick={() => handleImpersonate(customer)}
                        disabled={impersonating}
                        className="inline-flex items-center px-3 py-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-sm font-medium rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Login as this customer"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                        </svg>
                        Login as
                      </button>
                    )}
                    <button
                      onClick={() => handleEdit(customer)}
                      className="inline-flex items-center px-3 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-sm font-medium rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(customer.id)}
                      className="inline-flex items-center px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-medium rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                {editingCustomer ? t('editCustomer') : t('addCustomer')}
              </h2>
              <button onClick={resetForm} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="form-label">{t('name')}</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="form-input"
                />
              </div>

              <div>
                <label className="form-label">{t('phone')}</label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="form-input"
                  maxLength={10}
                  disabled={!!editingCustomer}
                />
                {editingCustomer && (
                  <p className="text-xs text-gray-500 mt-1">
                    Phone number cannot be changed
                  </p>
                )}
              </div>

              {!editingCustomer && (
                <div>
                  <label className="form-label">{t('password')}</label>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="form-input"
                    minLength={6}
                  />
                </div>
              )}

              <div>
                <label className="form-label">Is Admin</label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isAdmin}
                    onChange={(e) => setFormData({ ...formData, isAdmin: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Is Admin</span>
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Admin users can access the admin panel
                </p>
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              {message && (
                <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 px-4 py-3 rounded">
                  {message}
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
                >
                  {t('save')}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-2 px-4 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  {t('cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
