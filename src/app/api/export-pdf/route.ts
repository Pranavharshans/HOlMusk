import { NextRequest, NextResponse } from 'next/server';
import { jsPDF } from 'jspdf';

export async function POST(request: NextRequest) {
  try {
    const { markdown, title = 'Video Analysis Report' } = await request.json();

    if (!markdown) {
      return NextResponse.json({ error: 'Markdown content required' }, { status: 400 });
    }

    // Create new PDF document
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Set document properties
    doc.setProperties({
      title: title,
      subject: 'Video Analysis Report',
      author: 'HolMusk AI',
      creator: 'HolMusk AI Platform'
    });

    // Convert markdown to plain text for PDF (removing markdown syntax)
    const plainText = markdown
      .replace(/#{1,6}\s+/g, '') // Remove headers
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.*?)\*/g, '$1') // Remove italic
      .replace(/`(.*?)`/g, '$1') // Remove inline code
      .replace(/```[\s\S]*?```/g, '[Code Block]') // Replace code blocks
      .replace(/>\s+/g, '') // Remove blockquotes
      .replace(/[-*+]\s+/g, '• ') // Convert list items to bullets
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert links to text
      .trim();

    // Set font
    doc.setFont('helvetica');
    
    // Add title
    doc.setFontSize(20);
    doc.setTextColor(40, 40, 40);
    doc.text(title, 20, 30);
    
    // Add generation timestamp
    doc.setFontSize(10);
    doc.setTextColor(128, 128, 128);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 20, 40);
    
    // Add content
    doc.setFontSize(11);
    doc.setTextColor(60, 60, 60);
    
    // Split text into lines that fit the page width
    const pageWidth = doc.internal.pageSize.getWidth();
    const margins = 20;
    const maxLineWidth = pageWidth - (margins * 2);
    
    const lines = doc.splitTextToSize(plainText, maxLineWidth);
    
    let yPosition = 55;
    const lineHeight = 5;
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginBottom = 20;
    
    lines.forEach((line: string) => {
      // Check if we need a new page
      if (yPosition + lineHeight > pageHeight - marginBottom) {
        doc.addPage();
        yPosition = 20;
      }
      
      doc.text(line, margins, yPosition);
      yPosition += lineHeight;
    });

    // Generate PDF as buffer
    const pdfBuffer = doc.output('arraybuffer');

    // Return PDF file
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf"`,
        'Content-Length': pdfBuffer.byteLength.toString(),
      },
    });

  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
} 