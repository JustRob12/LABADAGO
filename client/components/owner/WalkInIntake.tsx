"use client";

import React, { useState } from "react";
import { LaundryTransaction, OrderStatus } from "@/types/auth";
import { updateTransactionStatus } from "@/lib/supabase/auth";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import {
  ScanLine,
  Search,
  CheckCircle2,
  Clock,
  Send,
  User,
  Phone,
  Shirt,
  DollarSign,
  Check,
} from "lucide-react";

interface WalkInIntakeProps {
  transactions: LaundryTransaction[];
  onTransactionsUpdated: () => void;
}

export const WalkInIntake: React.FC<WalkInIntakeProps> = ({
  transactions,
  onTransactionsUpdated,
}) => {
  const [scanInput, setScanInput] = useState("");
  const [scannedTx, setScannedTx] = useState<LaundryTransaction | null>(null);
  const [actualWeight, setActualWeight] = useState<number>(5.0);
  const [intakeSuccess, setIntakeSuccess] = useState<string | null>(null);
  const [smsNotification, setSmsNotification] = useState<string | null>(null);

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    setIntakeSuccess(null);
    setSmsNotification(null);

    const query = scanInput.trim().toUpperCase();
    if (!query) return;

    // Try finding by tracking number
    const found = transactions.find(
      (t) =>
        t.tracking_number.toUpperCase() === query ||
        t.tracking_number.replace(/-/g, "").toUpperCase() === query.replace(/-/g, "")
    );

    if (found) {
      setScannedTx(found);
      setActualWeight(found.weight_kg || 5.0);
    } else {
      // Check if raw JSON was pasted from QR
      try {
        const parsed = JSON.parse(scanInput);
        if (parsed.trackingNumber) {
          const match = transactions.find((t) => t.tracking_number === parsed.trackingNumber);
          if (match) {
            setScannedTx(match);
            setActualWeight(match.weight_kg);
            return;
          }
        }
      } catch {
        // ignore
      }
      alert(`No active walk-in record found for code: "${query}". Please check the QR code.`);
    }
  };

  const handleConfirmIntake = async () => {
    if (!scannedTx) return;

    await updateTransactionStatus(scannedTx.id, "Washing");
    setIntakeSuccess(
      `Walk-in load for ${scannedTx.customer_name} accepted! Machine timer started. Status updated to Washing.`
    );
    setSmsNotification(
      `SMS Notification sent to ${scannedTx.customer_phone}: "LabadaGo: Your laundry (${scannedTx.tracking_number}) has been weighed (${actualWeight}kg) and is now WASHING!"`
    );

    setScannedTx(null);
    setScanInput("");
    onTransactionsUpdated();
  };

  const handleStatusChange = async (txId: string, newStatus: OrderStatus) => {
    await updateTransactionStatus(txId, newStatus);
    onTransactionsUpdated();
    setSmsNotification(`Customer notified via SMS: Order ${txId} status changed to ${newStatus}.`);
  };

  return (
    <div className="space-y-6">
      {intakeSuccess && <Alert type="success" message={intakeSuccess} />}
      {smsNotification && <Alert type="info" message={smsNotification} />}

      {/* Counter QR Scanner / Code Entry Tool */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
          <ScanLine size={18} className="text-blue-600" />
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Counter Walk-In QR Scanner & Verification
            </h3>
            <p className="text-xs text-slate-500">
              Scan customer&apos;s phone QR pass or enter the tracking reference (e.g. LBD-84920)
            </p>
          </div>
        </div>

        <form onSubmit={handleLookup} className="mt-4 flex items-center gap-2">
          <div className="flex-1">
            <Input
              placeholder="Scan or enter Tracking Number (e.g. LBD-84920)"
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              leftIcon={<Search size={15} />}
            />
          </div>
          <Button type="submit" variant="primary" size="md" leftIcon={<ScanLine size={15} />}>
            Verify Code
          </Button>
        </form>

        {/* Scanned Verification Card */}
        {scannedTx && (
          <div className="mt-4 p-4 rounded-xl border border-blue-200 bg-blue-50/50 space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-blue-700 bg-white px-2 py-0.5 rounded-md border border-blue-200">
                {scannedTx.tracking_number}
              </span>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                Verified Customer
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <p className="text-slate-400">Customer Name</p>
                <p className="font-bold text-slate-900">{scannedTx.customer_name}</p>
              </div>
              <div>
                <p className="text-slate-400">Phone</p>
                <p className="font-bold text-slate-900">{scannedTx.customer_phone}</p>
              </div>
              <div>
                <p className="text-slate-400">Service Requested</p>
                <p className="font-bold text-slate-900">{scannedTx.service_name}</p>
              </div>
            </div>

            <div className="pt-2 border-t border-blue-200/60 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-700">Counter Scale Weight:</span>
                <input
                  type="number"
                  step="0.1"
                  value={actualWeight}
                  onChange={(e) => setActualWeight(parseFloat(e.target.value) || 1)}
                  className="w-20 h-8 rounded-md border border-slate-300 bg-white px-2 text-xs font-bold"
                />
                <span className="text-xs text-slate-500">kg</span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setScannedTx(null)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="success"
                  size="sm"
                  leftIcon={<Check size={14} />}
                  onClick={handleConfirmIntake}
                >
                  Accept & Start Washing
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Live Service Transactions Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Live Service Queue & Transactions</h3>
            <p className="text-xs text-slate-500">
              Update service progress and trigger automated customer notifications.
            </p>
          </div>
          <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
            {transactions.length} Total Orders
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-2.5 px-3">Tracking</th>
                <th className="py-2.5 px-3">Customer</th>
                <th className="py-2.5 px-3">Service</th>
                <th className="py-2.5 px-3">Weight</th>
                <th className="py-2.5 px-3">Amount</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Update Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-3 font-mono font-bold text-blue-600">
                    {tx.tracking_number}
                  </td>
                  <td className="py-3 px-3">
                    <p className="font-semibold text-slate-900">{tx.customer_name}</p>
                    <p className="text-[11px] text-slate-400">{tx.customer_phone}</p>
                  </td>
                  <td className="py-3 px-3 font-medium text-slate-800">{tx.service_name}</td>
                  <td className="py-3 px-3 text-slate-600">{tx.weight_kg} kg</td>
                  <td className="py-3 px-3 font-bold text-slate-900">₱{tx.total_amount.toFixed(2)}</td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded-md border text-[11px] font-medium bg-slate-50 text-slate-700 border-slate-200">
                      {tx.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <select
                      value={tx.status}
                      onChange={(e) => handleStatusChange(tx.id, e.target.value as OrderStatus)}
                      className="h-7 px-2 text-xs rounded-md border border-slate-200 bg-white font-medium text-slate-700"
                    >
                      <option value="Received">Received</option>
                      <option value="Washing">Washing</option>
                      <option value="Drying">Drying</option>
                      <option value="Folding">Folding</option>
                      <option value="Ready">Ready</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
