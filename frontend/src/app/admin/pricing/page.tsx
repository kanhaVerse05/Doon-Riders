'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import {
  Tag,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Star,
  RefreshCw,
  X,
  Check,
  AlertCircle,
  Sparkles,
  ShieldAlert,
  ArrowUpDown
} from 'lucide-react';

interface PricingPlan {
  id: number;
  name: string;
  slug?: string;
  tagline: string;
  price: number;
  period: string;
  badge?: string;
  features: string[] | string;
  security_deposit?: number;
  is_popular: boolean;
  is_active: boolean;
  display_order: number;
  created_at?: string;
  updated_at?: string;
}

export default function AdminPricingPage() {
  const { token } = useAuth();
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PricingPlan | null>(null);
  const [deletePlanId, setDeletePlanId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [price, setPrice] = useState<number | string>(1699);
  const [period, setPeriod] = useState('week');
  const [badge, setBadge] = useState('MOST POPULAR PLAN');
  const [securityDeposit, setSecurityDeposit] = useState<number | string>(2000);
  const [isPopular, setIsPopular] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [displayOrder, setDisplayOrder] = useState<number | string>(1);
  const [featureInputs, setFeatureInputs] = useState<string[]>([
      'No Driving License Required (Zero Hassle)',
      'Free Doorstep Maintenance & Technical Fault Coverage',
      'Swap, Don’t Wait — 2-Min Instant Battery Swapping at 15+ Hubs',
      '19×7 Dehradun Roadside Emergency Assistance (RSA)',
      '24×7 Dedicated Customer Support Helpline',
      'Zero Fuel Expense (Save ₹3,500+ every month)',
      'Complimentary DOT-Certified Helmet Included',
      'Standard Comprehensive Insurance Coverage'
  ]);
  const [newFeatureText, setNewFeatureText] = useState('');

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://doon-riders-backend.onrender.com/api';

  const fetchPlans = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${apiUrl}/admin/pricing-plans`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setPlans(data.data || []);
      } else {
        setError(data.message || 'Failed to load pricing plans');
      }
    } catch (err: any) {
      setError(err.message || 'Network error fetching pricing plans');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchPlans();
    }
  }, [token]);

  const openCreateModal = () => {
    setEditingPlan(null);
    setName('Weekly Pro Rider');
    setTagline('Our most popular high-performance electric scooty subscription for Dehradun students & daily commuters.');
    setPrice(1699);
    setPeriod('week');
    setBadge('MOST POPULAR PLAN');
    setSecurityDeposit(2000);
    setIsPopular(true);
    setIsActive(true);
    setDisplayOrder(plans.length + 1);
    setFeatureInputs([
      'No Driving License Required (Zero Hassle)',
      'Free Doorstep Maintenance & Technical Fault Coverage',
      'Swap, Don’t Wait — 2-Min Instant Battery Swapping at 15+ Hubs',
      '19×7 Dehradun Roadside Emergency Assistance (RSA)',
      '24×7 Dedicated Customer Support Helpline',
      'Zero Fuel Expense (Save ₹3,500+ every month)',
      'Complimentary DOT-Certified Helmet Included',
      'Standard Comprehensive Insurance Coverage'
    ]);
    setIsModalOpen(true);
  };

  const openEditModal = (plan: PricingPlan) => {
    setEditingPlan(plan);
    setName(plan.name);
    setTagline(plan.tagline || '');
    setPrice(plan.price);
    setPeriod(plan.period || 'week');
    setBadge(plan.badge || '');
    setSecurityDeposit(plan.security_deposit !== undefined ? plan.security_deposit : 2000);
    setIsPopular(Boolean(plan.is_popular));
    setIsActive(Boolean(plan.is_active));
    setDisplayOrder(plan.display_order || 1);

    let parsedFeats: string[] = [];
    if (Array.isArray(plan.features)) {
      parsedFeats = plan.features;
    } else if (typeof plan.features === 'string') {
      try {
        parsedFeats = JSON.parse(plan.features);
      } catch {
        parsedFeats = [plan.features];
      }
    }
    setFeatureInputs(parsedFeats.length > 0 ? parsedFeats : ['100% Fully Charged EV Scooty']);
    setIsModalOpen(true);
  };

  const handleAddFeature = () => {
    if (newFeatureText.trim()) {
      setFeatureInputs([...featureInputs, newFeatureText.trim()]);
      setNewFeatureText('');
    }
  };

  const handleRemoveFeature = (index: number) => {
    setFeatureInputs(featureInputs.filter((_, i) => i !== index));
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || price === '') {
      alert('Please fill out Plan Name and Price.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        name: name.trim(),
        tagline: tagline.trim(),
        price: Number(price),
        period,
        badge: badge.trim() || null,
        features: featureInputs,
        securityDeposit: Number(securityDeposit) || 0,
        isPopular,
        isActive,
        displayOrder: Number(displayOrder) || 1
      };

      const url = editingPlan
        ? `${apiUrl}/admin/pricing-plans/${editingPlan.id}`
        : `${apiUrl}/admin/pricing-plans`;
      const method = editingPlan ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg(editingPlan ? 'Pricing plan updated successfully!' : 'Pricing plan created successfully!');
        setIsModalOpen(false);
        fetchPlans();
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        alert(data.message || 'Error saving pricing plan.');
      }
    } catch (err: any) {
      alert(err.message || 'Network error saving plan.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePlan = async () => {
    if (!deletePlanId) return;
    try {
      setSubmitting(true);
      const res = await fetch(`${apiUrl}/admin/pricing-plans/${deletePlanId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Pricing plan deleted successfully!');
        setDeletePlanId(null);
        fetchPlans();
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        alert(data.message || 'Error deleting plan.');
      }
    } catch (err: any) {
      alert(err.message || 'Network error deleting plan.');
    } finally {
      setSubmitting(false);
    }
  };

  const getFeaturesList = (features: string[] | string): string[] => {
    if (Array.isArray(features)) return features;
    if (typeof features === 'string') {
      try {
        return JSON.parse(features);
      } catch {
        return [features];
      }
    }
    return [];
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-[#E5E7EB] shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#EAFBF2] border border-[#00D96B]/30 flex items-center justify-center text-[#00A854]">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-[#111827] font-heading">
                Pricing Plans Management
              </h1>
              <p className="text-xs text-[#667085] mt-0.5">
                Create, edit & manage live rental subscriptions (Default: ₹1,699/week plan)
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchPlans}
            disabled={loading}
            className="p-2.5 text-[#667085] hover:text-[#111827] hover:bg-[#F1F5F9] rounded-xl border border-[#E5E7EB] transition cursor-pointer"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={openCreateModal}
            className="px-4 py-2.5 bg-[#00D96B] hover:bg-[#85e600] text-[#111827] font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Plan</span>
          </button>
        </div>
      </div>

      {/* Alert Messages */}
      {successMsg && (
        <div className="p-4 bg-[#EAFBF2] border border-[#00D96B]/40 text-[#00A854] rounded-2xl flex items-center gap-3 text-xs font-bold animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl flex items-center gap-3 text-xs font-bold">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Plans Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white p-6 rounded-3xl border border-[#E5E7EB] animate-pulse h-96 space-y-4">
              <div className="h-6 bg-[#F1F5F9] rounded-lg w-1/2"></div>
              <div className="h-10 bg-[#F1F5F9] rounded-xl w-3/4"></div>
              <div className="space-y-2 pt-4">
                <div className="h-4 bg-[#F1F5F9] rounded w-full"></div>
                <div className="h-4 bg-[#F1F5F9] rounded w-5/6"></div>
                <div className="h-4 bg-[#F1F5F9] rounded w-4/6"></div>
              </div>
            </div>
          ))}
        </div>
      ) : plans.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-[#E5E7EB] text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-[#EAFBF2] text-[#00A854] flex items-center justify-center mx-auto">
            <Tag className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-[#111827]">No Pricing Plans Found</h3>
          <p className="text-xs text-[#667085] max-w-md mx-auto">
            Get started by creating your default ₹1,699 weekly rental plan or custom duration plans.
          </p>
          <button
            onClick={openCreateModal}
            className="px-5 py-2.5 bg-[#00D96B] hover:bg-[#85e600] text-[#111827] font-bold text-xs rounded-xl transition cursor-pointer inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Plan</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map(plan => {
            const featuresList = getFeaturesList(plan.features);

            return (
              <div
                key={plan.id}
                className={`bg-white rounded-3xl p-6 border flex flex-col justify-between transition-all duration-200 relative ${
                  plan.is_popular
                    ? 'border-2 border-[#00D96B] shadow-[0_8px_30px_rgba(0,217,107,0.12)]'
                    : 'border-[#E5E7EB] shadow-sm hover:border-[#00D96B]/50'
                }`}
              >
                {/* Popular Badge */}
                {plan.is_popular && (
                  <div className="absolute -top-3 left-6 bg-[#00D96B] text-[#111827] text-[10px] font-black uppercase tracking-wider px-3 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                    <Star className="w-2.5 h-2.5 fill-current" />
                    <span>{plan.badge || 'MOST POPULAR PLAN'}</span>
                  </div>
                )}

                {/* Plan Header */}
                <div className="space-y-4 pt-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-black text-[#111827]">{plan.name}</h3>
                      <p className="text-xs text-[#667085] mt-0.5 line-clamp-2">{plan.tagline || 'Flexible electric scooty subscription'}</p>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${
                        plan.is_active
                          ? 'bg-[#EAFBF2] text-[#00A854] border border-[#00D96B]/30'
                          : 'bg-gray-100 text-gray-500 border border-gray-200'
                      }`}
                    >
                      {plan.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </div>

                  {/* Price Tag */}
                  <div className="flex items-baseline gap-1.5 py-1">
                    <span className="text-3xl sm:text-4xl font-black text-[#111827] font-mono">
                      ₹{Number(plan.price).toLocaleString('en-IN')}
                    </span>
                    <span className="text-xs font-bold text-[#667085]">/ {plan.period || 'week'}</span>
                  </div>

                  {/* Security Deposit & Rate Info */}
                  <div className="bg-[#F8FAFC] p-2.5 rounded-xl border border-[#EEF2F6] flex items-center justify-between text-[11px] text-[#475467]">
                    <span>Security Deposit:</span>
                    <span className="font-bold text-[#111827]">₹{plan.security_deposit || 2000} (Refundable)</span>
                  </div>

                  {/* Features List */}
                  <div className="border-t border-[#F1F5F9] pt-4 space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#98A2B3]">
                      Included Features ({featuresList.length}):
                    </p>
                    <ul className="space-y-1.5 text-xs text-[#475467]">
                      {featuresList.slice(0, 6).map((feat, fIdx) => (
                        <li key={fIdx} className="flex items-start gap-2">
                          <div className="w-3.5 h-3.5 rounded-full bg-[#EAFBF2] text-[#00A854] flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                          <span className="leading-tight">{feat}</span>
                        </li>
                      ))}
                      {featuresList.length > 6 && (
                        <li className="text-[11px] text-[#98A2B3] italic pl-5">
                          + {featuresList.length - 6} more features included
                        </li>
                      )}
                    </ul>
                  </div>
                </div>

                {/* Plan Action Buttons */}
                <div className="pt-6 border-t border-[#F1F5F9] mt-6 flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(plan)}
                    className="flex-1 py-2 rounded-xl bg-[#F8FAFC] hover:bg-[#EAFBF2] hover:text-[#00A854] text-[#475467] font-bold text-xs border border-[#E5E7EB] transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit Plan</span>
                  </button>
                  <button
                    onClick={() => setDeletePlanId(plan.id)}
                    className="p-2 rounded-xl text-red-600 hover:bg-red-50 border border-red-100 transition cursor-pointer"
                    title="Delete Plan"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Plan Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-[#E5E7EB] my-8 animate-scaleUp">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#E5E7EB] flex items-center justify-between bg-[#F8FAFC]">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-[#00A854]" />
                <h3 className="font-bold text-base text-[#111827]">
                  {editingPlan ? `Edit Pricing Plan: ${editingPlan.name}` : 'Create New Pricing Plan'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-[#98A2B3] hover:text-[#111827] hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSavePlan} className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#111827] mb-1">
                    Plan Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Weekly Pro Rider"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] text-xs font-semibold focus:outline-none focus:border-[#00D96B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#111827] mb-1">
                    Price (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="1"
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                    placeholder="1699"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] text-xs font-semibold focus:outline-none focus:border-[#00D96B]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#111827] mb-1">
                    Billing Period
                  </label>
                  <select
                    value={period}
                    onChange={e => setPeriod(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] text-xs font-semibold focus:outline-none focus:border-[#00D96B] bg-white cursor-pointer"
                  >
                    <option value="week">Per Week (/ week)</option>
                    <option value="day">Per Day (/ day)</option>
                    <option value="month">Per Month (/ month)</option>
                    <option value="3-days">3 Days Plan (/ 3 days)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#111827] mb-1">
                    Security Deposit (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={securityDeposit}
                    onChange={e => setSecurityDeposit(e.target.value)}
                    placeholder="2000"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] text-xs font-semibold focus:outline-none focus:border-[#00D96B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#111827] mb-1">
                    Badge Label
                  </label>
                  <input
                    type="text"
                    value={badge}
                    onChange={e => setBadge(e.target.value)}
                    placeholder="e.g. MOST POPULAR"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] text-xs font-semibold focus:outline-none focus:border-[#00D96B]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#111827] mb-1">
                  Tagline / Short Summary
                </label>
                <input
                  type="text"
                  value={tagline}
                  onChange={e => setTagline(e.target.value)}
                  placeholder="e.g. Perfect for daily office commutes and weekend travels"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] text-xs font-semibold focus:outline-none focus:border-[#00D96B]"
                />
              </div>

              {/* Dynamic Features List */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-[#111827]">
                  What's Included (Feature Bullet Points)
                </label>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {featureInputs.map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-[#EAFBF2] text-[#00A854] flex items-center justify-center text-xs font-black flex-shrink-0">
                        {idx + 1}
                      </div>
                      <input
                        type="text"
                        value={feat}
                        onChange={e => {
                          const updated = [...featureInputs];
                          updated[idx] = e.target.value;
                          setFeatureInputs(updated);
                        }}
                        className="flex-1 px-3 py-1.5 rounded-xl border border-[#E5E7EB] text-xs font-medium focus:outline-none focus:border-[#00D96B]"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveFeature(idx)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer"
                        title="Remove feature"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="text"
                    value={newFeatureText}
                    onChange={e => setNewFeatureText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddFeature();
                      }
                    }}
                    placeholder="Add a new feature point..."
                    className="flex-1 px-3.5 py-2 rounded-xl border border-[#E5E7EB] text-xs font-medium focus:outline-none focus:border-[#00D96B]"
                  />
                  <button
                    type="button"
                    onClick={handleAddFeature}
                    className="px-4 py-2 bg-[#F1F5F9] hover:bg-[#EAFBF2] hover:text-[#00A854] text-[#111827] font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    + Add
                  </button>
                </div>
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#E5E7EB]">
                <label className="flex items-center gap-3 p-3 bg-[#F8FAFC] rounded-2xl border border-[#E5E7EB] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPopular}
                    onChange={e => setIsPopular(e.target.checked)}
                    className="w-4 h-4 text-[#00D96B] rounded border-gray-300 focus:ring-[#00D96B]"
                  />
                  <div>
                    <span className="text-xs font-bold text-[#111827] block">Mark as Popular Plan</span>
                    <span className="text-[10px] text-[#667085]">Highlights card with neon border on website</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 bg-[#F8FAFC] rounded-2xl border border-[#E5E7EB] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={e => setIsActive(e.target.checked)}
                    className="w-4 h-4 text-[#00D96B] rounded border-gray-300 focus:ring-[#00D96B]"
                  />
                  <div>
                    <span className="text-xs font-bold text-[#111827] block">Active / Visible</span>
                    <span className="text-[10px] text-[#667085]">Toggle live visibility on `/pricing` page</span>
                  </div>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E5E7EB]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-[#E5E7EB] text-xs font-bold text-[#475467] hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-[#00D96B] hover:bg-[#85e600] text-[#111827] font-bold text-xs transition cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Saving Plan...' : editingPlan ? 'Update Plan' : 'Save & Publish Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletePlanId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-[#E5E7EB] text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-[#111827]">Delete Pricing Plan?</h3>
            <p className="text-xs text-[#667085]">
              Are you sure you want to delete this plan? It will be removed from the public website immediately.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDeletePlanId(null)}
                className="px-4 py-2 rounded-xl border border-[#E5E7EB] text-xs font-bold text-[#475467] hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeletePlan}
                disabled={submitting}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer transition shadow-sm"
              >
                {submitting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
