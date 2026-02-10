"""
Streamlit Dashboard for Predictive Maintenance
Interactive dashboard for monitoring machine health and failure predictions
"""

import streamlit as st
import pandas as pd
import numpy as np
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import requests
from datetime import datetime, timedelta
import json
from pathlib import Path

# Color and font configuration
PRIMARY_BLUE = "#009ADD"
DARK_BLUE = "#005486"
WHITE = "#FFFFFF"
LIGHT_GRAY = "#F2F2F2"

GRAPH_COLORS = [
    "#82BC00",  # green
    "#006432",  # dark green
    "#BA257D",  # magenta
    "#7F1E5E",  # dark magenta
    "#F1B52C",  # yellow
    "#CE6D28",  # orange
]
BLACK = "#262626"

GLOBAL_FONT_FAMILY = "Century Gothic"

# Page configuration
st.set_page_config(
    page_title="Predictive Maintenance Dashboard",
    page_icon="🔧",
    layout="wide",
    initial_sidebar_state="expanded"
)

# API endpoint (configure for your deployment)
# API_URL = st.sidebar.text_input("API URL", value="http://localhost:8000")

# Custom CSS for better styling (font + colors)
st.markdown(f"""
    <style>
    * {{
        font-family: '{GLOBAL_FONT_FAMILY}', sans-serif !important;
    }}

    body, .stApp {{
        background-color: {LIGHT_GRAY};
        color: {BLACK};
    }}

    h1, h2, h3, h4, h5, h6 {{
        font-family: '{GLOBAL_FONT_FAMILY}', sans-serif !important;
        color: {BLACK};
    }}

    .main-header {{
        font-size: 3rem;
        font-weight: bold;
        font-family: '{GLOBAL_FONT_FAMILY}', sans-serif;
        color: {BLACK};
        text-align: center;
        padding: 1rem;
        margin-bottom: 2rem;
    }}

    [data-testid="stSidebar"] {{
        background-color: {PRIMARY_BLUE};
        font-weight: bold;
        color: {WHITE};
    }}

    [data-testid="stSidebar"] * {{
        color: {WHITE} !important;
        font-weight: bold;
    }}

    .stButton > button {{
        background-color: {PRIMARY_BLUE};
        color: {WHITE};
        font-weight: bold;
        border-radius: 4px;
        border: none;
    }}

    .stButton > button:hover {{
        background-color: {DARK_BLUE};
        color: {WHITE};
    }}

    [data-testid="stMetric"] {{
        background-color: {WHITE};
        border: 1px solid {PRIMARY_BLUE};
        border-radius: 4px;
        padding: 0.5rem;
        color: {BLACK};
    }}

    .stDataFrame div[data-testid="stStyledDataFrame"] {{
        font-family: '{GLOBAL_FONT_FAMILY}', sans-serif;
    }}
    </style>
""", unsafe_allow_html=True)

# Top navbar with logo (left) and navigation (right)
root_path = Path(__file__).resolve().parents[1]
logo_path = root_path / "black_logo.png"

nav_left, nav_center, nav_right = st.columns([1, 6, 2])
with nav_left:
    try:
        if logo_path.exists():
            st.image(str(logo_path), width=80)
    except Exception:
        pass

with nav_center:
    st.markdown('<h1 class="main-header">🔧 Predictive Maintenance Dashboard</h1>', unsafe_allow_html=True)

with nav_right:
    st.markdown("**Navigation**")
    page = nav_right.selectbox("Choose a page", [
        "Overview",
        "Machine Health",
        "Failure Predictions",
        "Cost Analysis",
        "Historical Trends"
    ])

# Mock data function (replace with actual API calls)
@st.cache_data(ttl=60)  # Cache for 60 seconds
def get_machine_data():
    """Fetch machine health data from API"""
    # In production, replace with actual API call
    # response = requests.get(f"{API_URL}/machines/health")
    # return response.json()
    
    # Mock data for demonstration
    return pd.DataFrame({
        'machine_id': [f'NPM-DX_{i:02d}' for i in range(1, 26)] + [f'Rack_A{i:02d}' for i in range(1, 26)],
        'asset_type': ['SMT'] * 25 + ['COOLING'] * 25,
        'health_score': np.random.uniform(40, 100, 50),
        'failure_probability': np.random.uniform(0, 0.6, 50),
        'status': np.random.choice(['Healthy', 'Warning', 'Critical'], 50, p=[0.6, 0.3, 0.1]),
        'last_maintenance': pd.date_range('2024-01-01', periods=50, freq='7D'),
        'downtime_hours': np.random.uniform(0, 24, 50)
    })


@st.cache_data(ttl=300)
def get_historical_data():
    """Fetch historical predictions"""
    # Mock historical data
    dates = pd.date_range('2024-01-01', periods=30, freq='D')
    return pd.DataFrame({
        'date': dates,
        'critical_count': np.random.randint(0, 5, 30),
        'warning_count': np.random.randint(5, 15, 30),
        'healthy_count': np.random.randint(30, 45, 30),
        'predicted_failures': np.random.randint(0, 3, 30),
        'actual_failures': np.random.randint(0, 2, 30)
    })


# Overview Page
if page == "Overview":
    st.markdown("<h2 class='sub-header'>📊 System Overview</h2>", unsafe_allow_html=True)

    
    # Fetch data
    df = get_machine_data()
    
    # Key Metrics
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        total_machines = len(df)
        st.metric("Total Machines", total_machines)
    
    with col2:
        critical_count = len(df[df['status'] == 'Critical'])
        st.metric("Critical Machines", critical_count, delta=f"-{critical_count}" if critical_count > 0 else None)
    
    with col3:
        st.metric("Net Savings", f"$47,000")
    
    with col4:
        total_failures_predicted = len(df[df['failure_probability'] > 0.5])
        st.metric("High-Risk Machines", total_failures_predicted)
    
    st.divider()
    
    # Health Score Distribution
    col1, col2 = st.columns(2)
    
    with col1:
        st.subheader("Health Score Distribution")
        fig = px.histogram(df, x='health_score', color='asset_type', 
                          nbins=20, title='Machine Health Distribution',
                          color_discrete_sequence=[PRIMARY_BLUE, DARK_BLUE])
        fig.update_layout(
            height=400,
            plot_bgcolor=WHITE,
            paper_bgcolor=WHITE,
            font=dict(family=GLOBAL_FONT_FAMILY, color=BLACK),
        )
        st.plotly_chart(fig, use_container_width=True)
    
    with col2:
        st.subheader("Status Breakdown")
        status_counts = df['status'].value_counts()
        fig = px.pie(values=status_counts.values, names=status_counts.index,
                    title='Machine Status Distribution',
                    color_discrete_map={
                        'Critical': GRAPH_COLORS[2],  # #BA257D
                        'Warning': GRAPH_COLORS[4],   # #F1B52C
                        'Healthy': GRAPH_COLORS[0],   # #82BC00
                    })
        fig.update_layout(
            height=400,
            paper_bgcolor=WHITE,
            font=dict(family=GLOBAL_FONT_FAMILY, color=BLACK),
        )
        st.plotly_chart(fig, use_container_width=True)
        
    
    # # Machine Health Table
    # st.subheader("Machine Health Status")
    
    # # Filter options
    # col1, col2 = st.columns(2)
    # with col1:
    #     asset_filter = st.multiselect("Filter by Asset Type", 
    #                                  options=df['asset_type'].unique(),
    #                                  default=df['asset_type'].unique())
    # with col2:
    #     status_filter = st.multiselect("Filter by Status",
    #                                   options=df['status'].unique(),
    #                                   default=df['status'].unique())
    
    # filtered_df = df[
    #     (df['asset_type'].isin(asset_filter)) & 
    #     (df['status'].isin(status_filter))
    # ]
    
    # # Color code the status column
    # def color_status(val):
    #     if val == 'Critical':
    #         return 'background-color: #BA257D; color: #FFFFFF'
    #     elif val == 'Warning':
    #         return 'background-color: #F1B52C; color: #262626'
    #     else:
    #         return 'background-color: #82BC00; color: #262626'
    
    # display_df = filtered_df[['machine_id', 'asset_type', 'health_score', 
    #                           'failure_probability', 'status', 'last_maintenance']].copy()
    # display_df['health_score'] = display_df['health_score'].round(2)
    # display_df['failure_probability'] = display_df['failure_probability'].round(4)
    
    # st.dataframe(
    #     display_df.style.applymap(color_status, subset=['status']),
    #     use_container_width=True,
    #     height=400
    # )

# Machine Health Page
elif page == "Machine Health":
    st.header("🏭 Individual Machine Health")
    
    df = get_machine_data()
    
    # Machine selector
    selected_machine = st.selectbox("Select Machine", df['machine_id'].unique())
    
    machine_data = df[df['machine_id'] == selected_machine].iloc[0]
    
    # Machine details
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.metric("Health Score", f"{machine_data['health_score']:.1f}")
    
    with col2:
        st.metric("Failure Probability", f"{machine_data['failure_probability']:.2%}")
    
    with col3:
        st.metric("Status", machine_data['status'])
    
    # Health score gauge
    st.subheader("Health Score Gauge")
    fig = go.Figure(go.Indicator(
        mode = "gauge+number",
        value = machine_data['health_score'],
        domain = {'x': [0, 1], 'y': [0, 1]},
        title = {'text': "Health Score"},
        gauge = {
            'axis': {'range': [None, 100]},
            'bar': {'color': GRAPH_COLORS[0]},  # #82BC00
            'steps': [
                {'range': [0, 50], 'color': GRAPH_COLORS[5]},   # #CE6D28
                {'range': [50, 70], 'color': GRAPH_COLORS[4]},  # #F1B52C
            ],
            'threshold': {
                'line': {'color': GRAPH_COLORS[2], 'width': 4},  # #BA257D
                'thickness': 0.75,
                'value': 50
            }
        }
    ))
    fig.update_layout(
        height=300,
        paper_bgcolor=WHITE,
        font=dict(family=GLOBAL_FONT_FAMILY, color=BLACK),
    )
    st.plotly_chart(fig, use_container_width=True)
    
    # Recommendations
    st.subheader("Recommendations")
    if machine_data['status'] == 'Critical':
        st.error("⚠️ **IMMEDIATE ACTION REQUIRED**")
        st.write("- Schedule maintenance within 24 hours")
        st.write("- Review recent sensor readings")
        st.write("- Prepare replacement parts if needed")
    elif machine_data['status'] == 'Warning':
        st.warning("⚠️ **PREVENTIVE ACTION RECOMMENDED**")
        st.write("- Schedule maintenance within 7 days")
        st.write("- Monitor sensor trends closely")
        st.write("- Review maintenance history")
    else:
        st.success("✅ **HEALTHY**")
        st.write("- Continue normal operations")
        st.write("- Regular monitoring sufficient")


# Failure Predictions Page
elif page == "Failure Predictions":
    st.header("⚠️ Failure Predictions & Alerts")
    
    df = get_machine_data()
    
    # Filter high-risk machines
    high_risk = df[df['failure_probability'] > 0.3].sort_values('failure_probability', ascending=False)
    
    st.subheader(f"High-Risk Machines ({len(high_risk)})")
    
    if len(high_risk) > 0:
        for idx, row in high_risk.iterrows():
            with st.expander(f"🔴 {row['machine_id']} - {row['status']} - Risk: {row['failure_probability']:.2%}"):
                col1, col2 = st.columns(2)
                
                with col1:
                    st.write(f"**Asset Type:** {row['asset_type']}")
                    st.write(f"**Health Score:** {row['health_score']:.1f}")
                    st.write(f"**Failure Probability:** {row['failure_probability']:.2%}")
                
                with col2:
                    st.write(f"**Last Maintenance:** {row['last_maintenance'].strftime('%Y-%m-%d')}")
                    st.write(f"**Downtime Hours:** {row['downtime_hours']:.1f}")
                
                # Action buttons
                col1, col2, col3 = st.columns(3)
                with col1:
                    if st.button(f"Schedule Maintenance", key=f"maintain_{idx}"):
                        st.success("Maintenance scheduled!")
                with col2:
                    if st.button(f"View Details", key=f"details_{idx}"):
                        st.info("Redirecting to machine details...")
                with col3:
                    if st.button(f"Dismiss Alert", key=f"dismiss_{idx}"):
                        st.info("Alert dismissed")
    else:
        st.success("✅ No high-risk machines detected")


# Cost Analysis Page
elif page == "Cost Analysis":
    st.header("💰 Cost-Benefit Analysis")
    
    st.subheader("ROI Calculator")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.write("**Costs**")
        maintenance_cost = st.number_input("Preventive Maintenance Cost ($)", value=2000, step=100)
        false_alarm_cost = st.number_input("False Alarm Cost ($)", value=500, step=50)
        system_cost = st.number_input("System Implementation Cost ($)", value=50000, step=1000)
    
    with col2:
        st.write("**Benefits**")
        avoided_downtime_cost = st.number_input("Avoided Downtime Cost ($)", value=50000, step=1000)
        avoided_repair_cost = st.number_input("Avoided Emergency Repair Cost ($)", value=20000, step=1000)
        production_saved = st.number_input("Production Loss Prevented ($)", value=30000, step=1000)
    
    # Calculate ROI
    total_cost = maintenance_cost + false_alarm_cost + system_cost
    total_benefit = avoided_downtime_cost + avoided_repair_cost + production_saved
    net_savings = total_benefit - total_cost
    roi_percent = (net_savings / total_cost * 100) if total_cost > 0 else 0
    
    st.divider()
    
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.metric("Total Cost", f"${total_cost:,.0f}")
    with col2:
        st.metric("Total Benefit", f"${total_benefit:,.0f}")
    with col3:
        st.metric("Net Savings", f"${net_savings:,.0f}", 
                 delta=f"{roi_percent:.1f}% ROI")
    with col4:
        st.metric("ROI", f"{roi_percent:.1f}%")
    
    # Visualization
    st.subheader("Cost Breakdown")
    cost_data = pd.DataFrame({
        'Category': ['Maintenance', 'False Alarms', 'System Cost', 'Downtime Avoided', 'Repair Avoided', 'Production Saved'],
        'Amount': [maintenance_cost, false_alarm_cost, system_cost, 
                  -avoided_downtime_cost, -avoided_repair_cost, -production_saved],
        'Type': ['Cost', 'Cost', 'Cost', 'Benefit', 'Benefit', 'Benefit']
    })
    
    fig = px.bar(cost_data, x='Category', y='Amount', color='Type',
                 title='Cost-Benefit Breakdown',
                 color_discrete_map={
                     'Cost': GRAPH_COLORS[5],     # #CE6D28
                     'Benefit': GRAPH_COLORS[0],  # #82BC00
                 })
    fig.update_layout(
        height=400,
        plot_bgcolor=WHITE,
        paper_bgcolor=WHITE,
        font=dict(family=GLOBAL_FONT_FAMILY, color=BLACK),
    )
    st.plotly_chart(fig, use_container_width=True)


# Historical Trends Page
elif page == "Historical Trends":
    st.header("📈 Historical Trends")
    
    hist_data = get_historical_data()
    
    # Date range selector
    col1, col2 = st.columns(2)
    with col1:
        start_date = st.date_input("Start Date", value=hist_data['date'].min())
    with col2:
        end_date = st.date_input("End Date", value=hist_data['date'].max())
    
    filtered_hist = hist_data[
        (hist_data['date'] >= pd.Timestamp(start_date)) &
        (hist_data['date'] <= pd.Timestamp(end_date))
    ]
    
    # Trend charts
    st.subheader("Machine Status Trends")
    
    fig = go.Figure()
    fig.add_trace(go.Scatter(x=filtered_hist['date'], y=filtered_hist['critical_count'],
                            mode='lines+markers', name='Critical', line=dict(color=GRAPH_COLORS[2])))
    fig.add_trace(go.Scatter(x=filtered_hist['date'], y=filtered_hist['warning_count'],
                            mode='lines+markers', name='Warning', line=dict(color=GRAPH_COLORS[4])))
    fig.add_trace(go.Scatter(x=filtered_hist['date'], y=filtered_hist['healthy_count'],
                            mode='lines+markers', name='Healthy', line=dict(color=GRAPH_COLORS[0])))
    
    fig.update_layout(
        height=400,
        xaxis_title='Date',
        yaxis_title='Count',
        plot_bgcolor=WHITE,
        paper_bgcolor=WHITE,
        font=dict(family=GLOBAL_FONT_FAMILY, color=BLACK),
    )
    st.plotly_chart(fig, use_container_width=True)
    
    # Prediction vs Actual
    st.subheader("Predicted vs Actual Failures")
    
    fig = go.Figure()
    fig.add_trace(go.Scatter(x=filtered_hist['date'], y=filtered_hist['predicted_failures'],
                            mode='lines+markers', name='Predicted', line=dict(color=GRAPH_COLORS[1])))
    fig.add_trace(go.Scatter(x=filtered_hist['date'], y=filtered_hist['actual_failures'],
                            mode='lines+markers', name='Actual', line=dict(color=GRAPH_COLORS[3])))
    
    fig.update_layout(
        height=400,
        xaxis_title='Date',
        yaxis_title='Failures',
        plot_bgcolor=WHITE,
        paper_bgcolor=WHITE,
        font=dict(family=GLOBAL_FONT_FAMILY, color=BLACK),
    )
    st.plotly_chart(fig, use_container_width=True)
    
    # Accuracy metrics
    st.subheader("Model Performance Metrics")
    
    total_predicted = filtered_hist['predicted_failures'].sum()
    total_actual = filtered_hist['actual_failures'].sum()
    
    col1, col2, col3 = st.columns(3)
    with col1:
        st.metric("Total Predicted", total_predicted)
    with col2:
        st.metric("Total Actual", total_actual)
    with col3:
        accuracy = (1 - abs(total_predicted - total_actual) / max(total_actual, 1)) * 100
        st.metric("Prediction Accuracy", f"{accuracy:.1f}%")


# Footer
st.divider()
# st.markdown("""
#     <div style='text-align: center; color: gray; padding: 1rem;'>
#         Predictive Maintenance Dashboard v1.0 | Last updated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
#     </div>
# """.format(datetime=datetime), unsafe_allow_html=True)
