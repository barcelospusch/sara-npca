"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { get, onValue, ref } from "firebase/database";
import { auth, database } from "@/firebase";
import { ArrowLeftIcon, ChartLineIcon, FunnelIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

const chartColors = ["#cc4331", "#1e90ff", "#5bc65e", "#ffef86"];
const statuses = ["Em análise", "Preliminar", "Provisório"];

function formatMonth(value) {
	return new Intl.DateTimeFormat("pt-BR", {
		month: "short",
		year: "2-digit",
	}).format(new Date(`${value}-02T00:00:00`));
}

function formatDate(value) {
	if (!value) return "-";
	return new Intl.DateTimeFormat("pt-BR").format(new Date(`${value}T00:00:00`));
}

function EmptyChart({ children }) {
	return <p className="statistics-empty-chart">{children}</p>;
}

function MonthlyChart({ data }) {
	const [activeIndex, setActiveIndex] = useState(null);
	const max = Math.max(...data.map((item) => item.value), 1);
	const width = 720;
	const height = 260;
	const left = 42;
	const bottom = 38;
	const top = 18;
	const graphWidth = width - left - 16;
	const graphHeight = height - top - bottom;
	const points = data.map((item, index) => ({
		x: left + (data.length === 1 ? graphWidth / 2 : (index / (data.length - 1)) * graphWidth),
		y: top + graphHeight - (item.value / max) * graphHeight,
	}));
	const line = points.map((point) => `${point.x},${point.y}`).join(" ");

	if (!data.length) return <EmptyChart>Nenhum registro no período filtrado.</EmptyChart>;

	return (
		<div className="statistics-chart-wrap">
			<svg className="statistics-line-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Evolução mensal dos registros">
				{[0, 0.5, 1].map((ratio) => {
					const y = top + graphHeight * ratio;
					return (
						<g key={ratio}>
							<line x1={left} x2={width - 16} y1={y} y2={y} className="chart-grid-line" />
							<text x={left - 10} y={y + 4} textAnchor="end" className="chart-axis-label">{Math.round(max * (1 - ratio))}</text>
						</g>
					);
				})}
				<polyline points={line} className="chart-line" />
				{points.map((point, index) => (
					<g key={data[index].label}>
						<circle
							cx={point.x}
							cy={point.y}
							r={activeIndex === index ? 7 : 5}
							className="chart-point"
							onMouseEnter={() => setActiveIndex(index)}
							onMouseLeave={() => setActiveIndex(null)}
						/>
						<text x={point.x} y={height - 12} textAnchor="middle" className="chart-axis-label">{data[index].label}</text>
						{activeIndex === index && (
							<g className="chart-tooltip">
								<rect x={point.x - 42} y={Math.max(0, point.y - 36)} width="84" height="24" />
								<text x={point.x} y={Math.max(16, point.y - 20)} textAnchor="middle">{data[index].value} registros</text>
							</g>
						)}
					</g>
				))}
			</svg>
		</div>
	);
}

function StatusChart({ data }) {
	const [active, setActive] = useState(null);
	const total = data.reduce((sum, item) => sum + item.value, 0);
	let offset = 0;
	const radius = 58;
	const circumference = 2 * Math.PI * radius;

	if (!total) return <EmptyChart>Nenhum candidato no período filtrado.</EmptyChart>;

	return (
		<div className="statistics-donut-layout">
			<div className="statistics-donut-wrap">
				<svg viewBox="0 0 150 150" className="statistics-donut" role="img" aria-label="Candidatos por status">
					<circle cx="75" cy="75" r={radius} className="donut-base" />
					{data.map((item, index) => {
						const length = (item.value / total) * circumference;
						const dashOffset = -offset;
						offset += length;
						return (
							<circle
								key={item.label}
								cx="75"
								cy="75"
								r={radius}
								className={`donut-segment ${active === index ? "active" : ""}`}
								style={{ stroke: chartColors[index], strokeDasharray: `${length} ${circumference - length}`, strokeDashoffset: dashOffset }}
								onMouseEnter={() => setActive(index)}
								onMouseLeave={() => setActive(null)}
							/>
						);
					})}
					<text x="75" y="72" textAnchor="middle" className="donut-total">{total}</text>
					<text x="75" y="88" textAnchor="middle" className="donut-caption">total</text>
				</svg>
			</div>
			<div className="statistics-legend">
				{data.map((item, index) => (
					<div key={item.label} className={`statistics-legend-item ${active === index ? "active" : ""}`} onMouseEnter={() => setActive(index)} onMouseLeave={() => setActive(null)}>
						<span className="legend-swatch" style={{ backgroundColor: chartColors[index] }} />
						<span>{item.label}</span>
						<strong>{item.value}</strong>
					</div>
				))}
			</div>
		</div>
	);
}

function MemberChart({ data }) {
	const [active, setActive] = useState(null);
	const max = Math.max(...data.map((item) => item.value), 1);

	if (!data.length) return <EmptyChart>Nenhum membro com registros.</EmptyChart>;

	return (
		<div className="statistics-member-chart">
			{data.map((item, index) => (
				<div key={item.label} className="member-bar-row" onMouseEnter={() => setActive(index)} onMouseLeave={() => setActive(null)}>
					<span className="member-bar-label" title={item.label}>{item.label}</span>
					<div className="member-bar-track">
						<div className={`member-bar ${active === index ? "active" : ""}`} style={{ width: `${(item.value / max) * 100}%` }} />
					</div>
					<strong>{item.value}</strong>
				</div>
			))}
		</div>
	);
}

function PsChart({ data }) {
	const total = data.reduce((sum, item) => sum + item.value, 0) || 1;
	return (
		<div className="statistics-ps-chart">
			{data.map((item, index) => (
				<div key={item.label} className="ps-bar-item">
					<div className="ps-bar-value">{item.value}</div>
					<div className="ps-bar-track"><div className="ps-bar" style={{ height: `${Math.max((item.value / total) * 100, item.value ? 8 : 0)}%`, backgroundColor: chartColors[index + 1] }} /></div>
					<strong>{item.label}</strong>
				</div>
			))}
		</div>
	);
}

export default function Estatisticas() {
	const router = useRouter();
	const [loading, setLoading] = useState(true);
	const [authorized, setAuthorized] = useState(false);
	const [candidates, setCandidates] = useState([]);
	const [members, setMembers] = useState([]);
	const [period, setPeriod] = useState("all");
	const [statusFilter, setStatusFilter] = useState("all");

	useEffect(() => {
		const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
			if (!user) {
				router.push("/login");
				return;
			}
			const snapshot = await get(ref(database, `usuarios/${user.uid}`));
			if (!snapshot.exists() || snapshot.val().admin !== true) {
                toast.error("Acesso negado: você não tem permissão para acessar esta página.");
				router.push("/");
				return;
			}
			setAuthorized(true);
		});
		return () => unsubscribeAuth();
	}, [router]);

	useEffect(() => {
		if (!authorized) return undefined;
		const candidatesUnsubscribe = onValue(ref(database, "candidatos"), (snapshot) => {
			const value = snapshot.exists() ? snapshot.val() : {};
			setCandidates(Object.values(value));
			setLoading(false);
		}, () => setLoading(false));
		const membersUnsubscribe = onValue(ref(database, "usuarios"), (snapshot) => {
			setMembers(snapshot.exists() ? Object.entries(snapshot.val()).map(([uid, value]) => ({ uid, ...value })) : []);
		});
		return () => {
			candidatesUnsubscribe();
			membersUnsubscribe();
		};
	}, [authorized]);

	const now = new Date();
	const cutoff = period === "all" ? null : new Date(now.getFullYear(), now.getMonth() - Number(period) + 1, 1);
	const filteredCandidates = candidates.filter((candidate) => {
		const date = candidate.date ? new Date(`${candidate.date}T00:00:00`) : null;
		return (!cutoff || (date && date >= cutoff)) && (statusFilter === "all" || candidate.status === statusFilter);
	});
	const statusData = statuses.map((label) => ({ label, value: filteredCandidates.filter((item) => (item.status || "Em análise") === label).length }));
	const psData = ["PS1", "PS2"].map((label) => ({ label, value: filteredCandidates.filter((item) => (item.ps || "PS1") === label).length }));
	const memberCounts = filteredCandidates.reduce((counts, candidate) => {
		const key = candidate.observerUid || candidate.observer || "Sem observador";
		counts[key] = (counts[key] || 0) + 1;
		return counts;
	}, {});
	const memberData = Object.entries(memberCounts).map(([key, value]) => {
		const member = members.find((item) => item.uid === key);
		return { label: member?.nome || member?.name || (member?.email ? member.email.split("@")[0] : key), value };
	}).sort((a, b) => b.value - a.value).slice(0, 8);
	const monthlyCounts = filteredCandidates.reduce((counts, candidate) => {
		if (candidate.date) {
			const month = candidate.date.slice(0, 7);
			counts[month] = (counts[month] || 0) + 1;
		}
		return counts;
	}, {});
	const monthlyData = Object.entries(monthlyCounts).sort(([a], [b]) => a.localeCompare(b)).slice(-8).map(([label, value]) => ({ label: formatMonth(label), value }));
	const latestDate = filteredCandidates.reduce((latest, item) => item.date > latest ? item.date : latest, "");

	if (loading || !authorized) {
		return <main className="center-container statistics-loading"><p className="login-text">Carregando estatísticas...</p></main>;
	}

	return (
		<main className="statistics-page">
			<header className="statistics-header">
				<div>
					<p className="statistics-eyebrow"><ChartLineIcon size={18} /> PAINEL DE LEITURA</p>
					<h1>Estatísticas</h1>
					<p className="statistics-intro">Uma visão viva dos registros, ritmos e pessoas por trás da busca.</p>
				</div>
				<Link href="/" className="btn secondary statistics-back"><ArrowLeftIcon /> Voltar ao dashboard</Link>
			</header>

			<section className="statistics-toolbar" aria-label="Filtros de estatísticas">
				<div className="statistics-toolbar-title"><FunnelIcon size={18} /> Recorte dos dados</div>
				<label>Período<select value={period} onChange={(event) => setPeriod(event.target.value)}><option value="all">Todo o período</option><option value="12">Últimos 12 meses</option><option value="6">Últimos 6 meses</option><option value="3">Últimos 3 meses</option></select></label>
				<label>Status<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">Todos os status</option>{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
			</section>

			<section className="statistics-kpis">
				<div className="statistics-kpi"><span>Total exibido</span><strong>{filteredCandidates.length}</strong><small>{candidates.length} registros totais</small></div>
				<div className="statistics-kpi statistics-kpi-accent"><span>Membros ativos</span><strong>{Object.keys(memberCounts).length}</strong><small>com ao menos um registro</small></div>
				<div className="statistics-kpi"><span>Mais registros</span><strong>{memberData[0]?.value || 0}</strong><small>{memberData[0]?.label || "Nenhum membro"}</small></div>
				<div className="statistics-kpi"><span>Registro mais recente</span><strong>{formatDate(latestDate)}</strong><small>data observada</small></div>
			</section>

			<section className="statistics-grid">
				<article className="statistics-card statistics-card-wide"><div className="statistics-card-heading"><div><span className="statistics-card-kicker">RITMO</span><h2>Registros por mês</h2></div><span className="statistics-card-note">últimos 8 meses com atividade</span></div><MonthlyChart data={monthlyData} /></article>
				<article className="statistics-card"><div className="statistics-card-heading"><div><span className="statistics-card-kicker">STATUS</span><h2>Andamento das análises</h2></div></div><StatusChart data={statusData} /></article>
				<article className="statistics-card statistics-card-wide"><div className="statistics-card-heading"><div><span className="statistics-card-kicker">PARTICIPAÇÃO</span><h2>Quem mais registrou</h2></div><span className="statistics-card-note">top 8 membros</span></div><MemberChart data={memberData} /></article>
				<article className="statistics-card"><div className="statistics-card-heading"><div><span className="statistics-card-kicker">PS</span><h2>Distribuição por PS</h2></div></div><PsChart data={psData} /></article>
			</section>
		</main>
	);
}
