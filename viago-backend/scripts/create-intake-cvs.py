import json
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import simpleSplit
from pypdf import PdfReader

root = Path(__file__).resolve().parents[2]
data = json.loads((root/'viago-backend/prisma/intake-data.json').read_text(encoding='utf-8'))
out = root/'artifacts/intake-cv'
out.mkdir(parents=True, exist_ok=True)
pdfmetrics.registerFont(TTFont('ArialCV', 'C:/Windows/Fonts/arial.ttf'))
pdfmetrics.registerFont(TTFont('ArialCVBold', 'C:/Windows/Fonts/arialbd.ttf'))
jobs = {'TD001':'Tài xế xe khách (Hạng E)', 'TD002':'Nhân viên Điều phối vận hành', 'TD003':'Nhân viên Chăm sóc khách hàng', 'TD004':'Nhân viên Bán vé tại quầy'}
for i, item in enumerate(data['applications'], 1):
    file = out/f'candidate-{i:02}.pdf'
    c = canvas.Canvas(str(file), pagesize=A4)
    c.setTitle('Hồ sơ ứng tuyển - ' + item['name'])
    c.setFillColor(HexColor('#00236f')); c.rect(0, 685, 596, 157, fill=1, stroke=0)
    c.setFillColor(HexColor('#ffffff')); c.setFont('ArialCVBold', 24); c.drawString(48, 772, item['name'])
    c.setFont('ArialCV', 13); c.drawString(48, 741, jobs[item['jobId']])
    c.setFont('ArialCV', 10); c.drawString(48, 714, f'viago.ungvien.{i:02}@example.invalid  |  090000{i+100:04}')
    y = 646
    sections = [('THÔNG TIN HỌC VẤN', item['education']), ('KINH NGHIỆM LÀM VIỆC', item['experience']), ('MỤC TIÊU NGHỀ NGHIỆP', 'Mong muốn phát huy kinh nghiệm, tuân thủ quy trình vận hành và đồng hành lâu dài cùng VIAGO.'), ('GHI CHÚ HỒ SƠ', 'Dữ liệu khởi tạo theo yêu cầu để kiểm tra chức năng tiếp nhận và xử lý ứng tuyển; không phải hồ sơ ứng viên thực tế.')]
    for title, text in sections:
        c.setFillColor(HexColor('#00236f')); c.setFont('ArialCVBold', 12); c.drawString(48, y, title); y -= 26
        c.setFillColor(HexColor('#334155')); c.setFont('ArialCV', 11)
        for line in simpleSplit(text, 'ArialCV', 11, 495): c.drawString(48, y, line); y -= 19
        y -= 25
    c.setStrokeColor(HexColor('#cbd5e1')); c.line(48, 70, 547, 70)
    c.setFillColor(HexColor('#64748b')); c.setFont('ArialCV', 9); c.drawString(48, 48, 'VIAGO - Hồ sơ khởi tạo phục vụ kiểm tra quy trình tuyển dụng')
    c.save()
    pdf = PdfReader(str(file))
    assert len(pdf.pages) == 1 and item['name'] in pdf.pages[0].extract_text()
print(json.dumps({'generated':len(data['applications']), 'pagesPerFile':1}))
