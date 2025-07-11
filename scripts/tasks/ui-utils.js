export function formatKoreanDateTime(dateString) {
  const d = new Date(dateString);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  let hour = d.getHours();
  const minute = String(d.getMinutes()).padStart(2, '0');
  const period = hour < 12 ? '오전' : '오후';
  hour = hour % 12 || 12;
  const hourStr = String(hour).padStart(2, '0');
  return `${yyyy}.${mm}.${dd} ${period}${hourStr}:${minute}`;
}

export function handleContentChange() {
  const contentSelect = document.getElementById('content');
  const etcInput = document.getElementById('contentEtc');
  if (!contentSelect || !etcInput) return;

  if (contentSelect.value === '') {
    etcInput.style.display = 'none';
  } else if (contentSelect.value === '기타') {
    etcInput.style.display = 'block';
  } else {
    etcInput.style.display = 'none';
  }
}
