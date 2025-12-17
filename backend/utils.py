from datetime import datetime, timedelta
from dateutil import rrule
import pandas as pd
from io import StringIO
from typing import List, Dict

def calculate_work_days(start_date_str: str, end_date_str: str) -> int:
    """Calculate work days between two dates (excluding weekends)"""
    try:
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
        
        # Use rrule to count weekdays
        work_days = len(list(rrule.rrule(
            rrule.DAILY,
            dtstart=start_date,
            until=end_date,
            byweekday=(rrule.MO, rrule.TU, rrule.WE, rrule.TH, rrule.FR)
        )))
        
        return work_days
    except Exception as e:
        # If parsing fails, return calendar days
        return (end_date - start_date).days + 1

def export_to_csv(data: List[Dict]) -> str:
    """Export data to CSV format"""
    if not data:
        return ""
    
    df = pd.DataFrame(data)
    csv_buffer = StringIO()
    df.to_csv(csv_buffer, index=False, encoding='utf-8')
    return csv_buffer.getvalue()

def check_overlap(requests: List[Dict], start_date: str, end_date: str, max_allowed: int) -> List[Dict]:
    """Check for vacation overlaps in department"""
    warnings = []
    start = datetime.strptime(start_date, '%Y-%m-%d').date()
    end = datetime.strptime(end_date, '%Y-%m-%d').date()
    
    # Create a date range for the requested vacation
    requested_dates = set()
    current = start
    while current <= end:
        requested_dates.add(current)
        current += timedelta(days=1)
    
    # Count overlapping employees for each date
    overlap_counts = {}
    for req in requests:
        if req.get('status') != 'approved':
            continue
            
        req_start = datetime.strptime(req['start_date'], '%Y-%m-%d').date()
        req_end = datetime.strptime(req['end_date'], '%Y-%m-%d').date()
        
        current = req_start
        while current <= req_end:
            if current in requested_dates:
                if current not in overlap_counts:
                    overlap_counts[current] = {'count': 0, 'employees': []}
                overlap_counts[current]['count'] += 1
                overlap_counts[current]['employees'].append(req.get('user_id'))
            current += timedelta(days=1)
    
    # Create warnings for dates exceeding limit
    for date, data in overlap_counts.items():
        if data['count'] >= max_allowed:
            warnings.append({
                'date': date.strftime('%Y-%m-%d'),
                'count': data['count'] + 1,  # +1 for the new request
                'employees': data['employees'],
                'max_allowed': max_allowed
            })
    
    return warnings