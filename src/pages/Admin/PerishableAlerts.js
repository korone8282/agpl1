import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ThermometerSnowflake,
  AlertCircle,
  PhoneCall,
  CheckCircle2,
  Calendar,
  RefreshCw,
  Printer,
  ArrowLeft
} from 'lucide-react';
import { apiConnector } from '../../redux/Utils/apiConnector';
import { INVENTORY_MRP_URL } from '../../redux/Utils/constants';
import Loader from '../../components/Loader';
import { toast } from 'react-toastify';

const PerishableAlerts = () => {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const res = await apiConnector(`${INVENTORY_MRP_URL}/perishable-alerts`, 'GET');
      if (res.data?.success) {
        setAlerts(res.data.data);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load perishable alerts');
    } finally {
      setLoading(false);
    }
  };

  const dueTodayCount = alerts.filter((a) => a.isOrderDueToday || a.isOverdue).length;

  return (
    <div className="w-full min-h-screen bg-black text-white py-6 px-4 sm:px-6 lg:px-8">
      {/* Back to Dashboard */}
      <button
        onClick={() => navigate('/')}
        className="inline-flex items-center gap-2 text-xs font-medium text-gray-400 hover:text-white transition-colors mb-6 group"
      >
        <ArrowLeft className="w-4 h-4 text-primary group-hover:-translate-x-1 transition-transform" />
        Back to Dashboard
      </button>

      {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3">
              <ThermometerSnowflake className="w-8 h-8 text-cyan-400" />
              <h1 className="text-3xl font-bold tracking-tight">Daily Perishable Order Sheet</h1>
            </div>
            <p className="text-gray-400 text-sm mt-1">
              Cold storage procurement schedule & lead-time alerts (Order-By = Production Date - Lead Time)
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white transition-all text-sm"
            >
              <Printer className="w-4 h-4 text-cyan-400" />
              Print Daily Sheet
            </button>
            <button
              onClick={fetchAlerts}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-gray-300 transition-all text-sm"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Top Metric Alerts */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-cyan-950/20 border border-cyan-500/20 rounded-2xl p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between text-cyan-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Cold Storage Demands</span>
              <ThermometerSnowflake className="w-5 h-5" />
            </div>
            <div className="text-2xl font-bold text-cyan-300">{alerts.length}</div>
            <div className="text-xs text-gray-400 mt-1">Batches requiring perishable items</div>
          </div>

          <div className="bg-rose-950/20 border border-rose-500/20 rounded-2xl p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between text-rose-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Due for Order Today / Overdue</span>
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="text-2xl font-bold text-rose-300">{dueTodayCount}</div>
            <div className="text-xs text-gray-400 mt-1">Place order immediately with mandi/vendor</div>
          </div>

          <div className="bg-secondary/20 border border-white/10 rounded-2xl p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Upcoming Production</span>
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <div className="text-2xl font-bold">{alerts.length - dueTodayCount}</div>
            <div className="text-xs text-gray-400 mt-1">Scheduled within the next 48-72 hours</div>
          </div>
        </div>

        {/* Perishable Order List */}
        {loading ? (
          <div className="py-20 flex justify-center">
            <Loader />
          </div>
        ) : alerts.length === 0 ? (
          <div className="bg-secondary/10 border border-white/10 rounded-2xl p-12 text-center text-gray-400">
            <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500 mb-3" />
            <p className="text-lg font-medium text-gray-300">No Perishable Orders Pending</p>
            <p className="text-sm mt-1 text-gray-500">
              Either cold stock is sufficient or no upcoming production batches require perishables.
            </p>
          </div>
        ) : (
          <div className="bg-secondary/10 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10 text-gray-400 font-semibold uppercase tracking-wider">
                    <th className="py-4 px-6">Material Name</th>
                    <th className="py-4 px-4">Production Order</th>
                    <th className="py-4 px-4">Production Date</th>
                    <th className="py-4 px-4 text-right">Gross Required</th>
                    <th className="py-4 px-4 text-right">In Cold Store</th>
                    <th className="py-4 px-4 text-center">Lead Time</th>
                    <th className="py-4 px-4 text-center">Order-By Deadline</th>
                    <th className="py-4 px-4">Preferred Supplier</th>
                    <th className="py-4 px-6 text-center">Action Urgency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {alerts.map((alt, idx) => {
                    const isDue = alt.isOrderDueToday || alt.isOverdue;
                    return (
                      <tr
                        key={idx}
                        className={`hover:bg-white/5 transition-colors ${
                          isDue ? 'bg-rose-950/15' : ''
                        }`}
                      >
                        <td className="py-4 px-6 font-semibold text-white">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                            {alt.materialName}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-gray-300">
                          <div>{alt.productName}</div>
                          <span className="font-mono text-[12px] text-gray-500">{alt.orderNumber}</span>
                        </td>
                        <td className="py-4 px-4 text-gray-300 font-mono">
                          {new Date(alt.productionDate).toLocaleDateString()}
                        </td>
                        <td className="py-4 px-4 text-right font-mono font-bold text-cyan-300">
                          {alt.grossRequired} {alt.unit}
                        </td>
                        <td className="py-4 px-4 text-right font-mono text-gray-300">
                          {alt.currentStock} {alt.unit}
                        </td>
                        <td className="py-4 px-4 text-center text-gray-300 font-mono">
                          {alt.leadTimeDays} {alt.leadTimeDays === 1 ? 'day' : 'days'}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span
                            className={`font-mono font-semibold ${
                              isDue ? 'text-rose-400 font-bold' : 'text-gray-300'
                            }`}
                          >
                            {new Date(alt.orderByDate).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-gray-400">
                          {alt.preferredSupplier ? (
                            <span className="flex items-center gap-1.5 text-gray-300">
                              <PhoneCall className="w-3 h-3 text-cyan-400" />
                              {alt.preferredSupplier}
                            </span>
                          ) : (
                            'Local Mandi'
                          )}
                        </td>
                        <td className="py-4 px-6 text-center">
                          {alt.isOverdue ? (
                            <span className="px-2.5 py-1 rounded-full text-[12px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse">
                              OVERDUE
                            </span>
                          ) : alt.isOrderDueToday ? (
                            <span className="px-2.5 py-1 rounded-full text-[12px] font-bold bg-orange-500/20 text-orange-300 border border-orange-500/30 animate-pulse">
                              ORDER TODAY
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[12px] font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                              UPCOMING
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
    </div>
  );
};

export default PerishableAlerts;
