import React, { useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar } from "recharts";
import { Download, Play, RefreshCw, TrendingUp, PiggyBank, AlertTriangle, Target } from "lucide-react";

// Simple seeded RNG (Mulberry32)
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Box-Muller transform for standard normals
function randn(rng: () => number) {
  let u = 0, v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// Compute quantile
function quantile(arr: number[], q: number): number {
  if (arr.length === 0) return NaN;
  const sorted = [...arr].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  } else {
    return sorted[base];
  }
}

// Histogram bins
function histogram(values: number[], bins = 40) {
  if (values.length === 0) return [] as { bin: string; count: number }[];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const width = (max - min) / bins;
  
  const binCounts = Array(bins).fill(0);
  values.forEach(value => {
    const binIndex = Math.min(Math.floor((value - min) / width), bins - 1);
    binCounts[binIndex]++;
  });
  
  return binCounts.map((count, i) => ({
    bin: `$${Math.round(min + i * width / 1000)}K`,
    count
  }));
}

// Monte Carlo simulation
function runMonteCarloSimulation(
  initialAmount: number,
  annualReturn: number,
  volatility: number,
  years: number,
  numSimulations: number,
  seed: number = 42
) {
  const rng = mulberry32(seed);
  const simulations: { year: number; value: number }[][] = [];
  const finalValues: number[] = [];
  
  for (let sim = 0; sim < numSimulations; sim++) {
    const path = [{ year: 0, value: initialAmount }];
    let currentValue = initialAmount;
    
    for (let year = 1; year <= years; year++) {
      const randomReturn = randn(rng) * volatility + annualReturn;
      currentValue = currentValue * (1 + randomReturn);
      path.push({ year, value: currentValue });
    }
    
    simulations.push(path);
    finalValues.push(currentValue);
  }
  
  return { simulations, finalValues };
}

export default function MonteCarloSimulator() {
  const [params, setParams] = useState({
    initialAmount: 100000,
    annualReturn: 0.07,
    volatility: 0.15,
    years: 30,
    numSimulations: 1000
  });
  
  const [isRunning, setIsRunning] = useState(false);
  const [seed, setSeed] = useState(42);
  
  const results = useMemo(() => {
    if (isRunning) return null;
    
    const { simulations, finalValues } = runMonteCarloSimulation(
      params.initialAmount,
      params.annualReturn,
      params.volatility,
      params.years,
      params.numSimulations,
      seed
    );
    
    const stats = {
      mean: finalValues.reduce((sum, val) => sum + val, 0) / finalValues.length,
      median: quantile(finalValues, 0.5),
      q10: quantile(finalValues, 0.1),
      q25: quantile(finalValues, 0.25),
      q75: quantile(finalValues, 0.75),
      q90: quantile(finalValues, 0.9),
      min: Math.min(...finalValues),
      max: Math.max(...finalValues),
      probLoss: finalValues.filter(val => val < params.initialAmount).length / finalValues.length
    };
    
    return { simulations, finalValues, stats };
  }, [params, seed, isRunning]);
  
  const pathData = useMemo(() => {
    if (!results) return [];
    
    const { simulations, stats } = results;
    const years = Array.from({ length: params.years + 1 }, (_, i) => i);
    
    return years.map(year => {
      const yearValues = simulations.map(sim => sim[year].value);
      return {
        year,
        median: quantile(yearValues, 0.5),
        q10: quantile(yearValues, 0.1),
        q25: quantile(yearValues, 0.25),
        q75: quantile(yearValues, 0.75),
        q90: quantile(yearValues, 0.9)
      };
    });
  }, [results, params.years]);
  
  const histogramData = useMemo(() => {
    if (!results) return [];
    return histogram(results.finalValues, 30);
  }, [results]);
  
  const runSimulation = () => {
    setIsRunning(true);
    setTimeout(() => setIsRunning(false), 100);
  };
  
  const resetSimulation = () => {
    setSeed(Math.floor(Math.random() * 10000));
  };
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };
  
  const formatPercent = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
            Monte Carlo Investment Simulator
          </h1>
          <p className="text-slate-300 text-lg">
            Explore thousands of possible investment outcomes using advanced probability modeling
          </p>
        </div>

        {/* Controls */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Initial Investment</label>
              <input
                type="number"
                value={params.initialAmount}
                onChange={(e) => setParams(prev => ({...prev, initialAmount: Number(e.target.value)}))}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Annual Return (%)</label>
              <input
                type="number"
                step="0.1"
                value={params.annualReturn * 100}
                onChange={(e) => setParams(prev => ({...prev, annualReturn: Number(e.target.value) / 100}))}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Volatility (%)</label>
              <input
                type="number"
                step="0.1"
                value={params.volatility * 100}
                onChange={(e) => setParams(prev => ({...prev, volatility: Number(e.target.value) / 100}))}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Time Horizon (Years)</label>
              <input
                type="number"
                value={params.years}
                onChange={(e) => setParams(prev => ({...prev, years: Number(e.target.value)}))}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Simulations</label>
              <input
                type="number"
                value={params.numSimulations}
                onChange={(e) => setParams(prev => ({...prev, numSimulations: Number(e.target.value)}))}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
              />
            </div>
          </div>
          
          <div className="flex gap-4 mt-6">
            <button
              onClick={runSimulation}
              disabled={isRunning}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 px-6 py-2 rounded-lg font-medium transition-all"
            >
              {isRunning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {isRunning ? 'Running...' : 'Run Simulation'}
            </button>
            <button
              onClick={resetSimulation}
              className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 px-6 py-2 rounded-lg font-medium transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              New Seed
            </button>
          </div>
        </div>

        {results && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-2">
                  <TrendingUp className="w-6 h-6 text-green-400" />
                  <span className="text-green-400 font-medium">Expected Value</span>
                </div>
                <div className="text-2xl font-bold text-white">{formatCurrency(results.stats.mean)}</div>
                <div className="text-green-300 text-sm mt-1">
                  {formatPercent((results.stats.mean - params.initialAmount) / params.initialAmount)} gain
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Target className="w-6 h-6 text-blue-400" />
                  <span className="text-blue-400 font-medium">Median Outcome</span>
                </div>
                <div className="text-2xl font-bold text-white">{formatCurrency(results.stats.median)}</div>
                <div className="text-blue-300 text-sm mt-1">50th percentile</div>
              </div>

              <div className="bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/30 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-2">
                  <AlertTriangle className="w-6 h-6 text-orange-400" />
                  <span className="text-orange-400 font-medium">Risk of Loss</span>
                </div>
                <div className="text-2xl font-bold text-white">{formatPercent(results.stats.probLoss)}</div>
                <div className="text-orange-300 text-sm mt-1">Below initial investment</div>
              </div>

              <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-2">
                  <PiggyBank className="w-6 h-6 text-purple-400" />
                  <span className="text-purple-400 font-medium">Best Case (90th)</span>
                </div>
                <div className="text-2xl font-bold text-white">{formatCurrency(results.stats.q90)}</div>
                <div className="text-purple-300 text-sm mt-1">Top 10% of outcomes</div>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Portfolio Path Chart */}
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
                <h3 className="text-xl font-bold mb-4">Portfolio Growth Projections</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={pathData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                      <XAxis dataKey="year" stroke="#94a3b8" />
                      <YAxis 
                        stroke="#94a3b8"
                        tickFormatter={(value) => `${Math.round(value/1000)}K`}
                      />
                      <Tooltip 
                        formatter={(value) => [formatCurrency(Number(value)), ""]}
                        labelFormatter={(label) => `Year ${label}`}
                        contentStyle={{
                          backgroundColor: '#1e293b',
                          border: '1px solid #475569',
                          borderRadius: '8px'
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="q90" 
                        stroke="#22d3ee" 
                        strokeWidth={2} 
                        dot={false}
                        name="90th percentile"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="q75" 
                        stroke="#60a5fa" 
                        strokeWidth={2} 
                        dot={false}
                        name="75th percentile"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="median" 
                        stroke="#34d399" 
                        strokeWidth={3} 
                        dot={false}
                        name="Median"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="q25" 
                        stroke="#fbbf24" 
                        strokeWidth={2} 
                        dot={false}
                        name="25th percentile"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="q10" 
                        stroke="#f87171" 
                        strokeWidth={2} 
                        dot={false}
                        name="10th percentile"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Distribution Chart */}
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
                <h3 className="text-xl font-bold mb-4">Final Portfolio Distribution</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={histogramData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                      <XAxis dataKey="bin" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: '#1e293b',
                          border: '1px solid #475569',
                          borderRadius: '8px'
                        }}
                      />
                      <Bar dataKey="count" fill="url(#colorGradient)" />
                      <defs>
                        <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Detailed Stats */}
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 mt-8">
              <h3 className="text-xl font-bold mb-4">Detailed Statistics</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <div className="text-center">
                  <div className="text-slate-400 text-sm">Minimum</div>
                  <div className="font-bold text-red-400">{formatCurrency(results.stats.min)}</div>
                </div>
                <div className="text-center">
                  <div className="text-slate-400 text-sm">10th Percentile</div>
                  <div className="font-bold text-orange-400">{formatCurrency(results.stats.q10)}</div>
                </div>
                <div className="text-center">
                  <div className="text-slate-400 text-sm">25th Percentile</div>
                  <div className="font-bold text-yellow-400">{formatCurrency(results.stats.q25)}</div>
                </div>
                <div className="text-center">
                  <div className="text-slate-400 text-sm">75th Percentile</div>
                  <div className="font-bold text-blue-400">{formatCurrency(results.stats.q75)}</div>
                </div>
                <div className="text-center">
                  <div className="text-slate-400 text-sm">90th Percentile</div>
                  <div className="font-bold text-purple-400">{formatCurrency(results.stats.q90)}</div>
                </div>
                <div className="text-center">
                  <div className="text-slate-400 text-sm">Maximum</div>
                  <div className="font-bold text-green-400">{formatCurrency(results.stats.max)}</div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}