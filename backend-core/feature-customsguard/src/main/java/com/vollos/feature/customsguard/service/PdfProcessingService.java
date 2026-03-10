package com.vollos.feature.customsguard.service;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.apache.pdfbox.text.PDFTextStripper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

@Service
public class PdfProcessingService {

    private static final Logger log = LoggerFactory.getLogger(PdfProcessingService.class);
    private static final int MIN_TEXT_LENGTH = 50; // Threshold for "enough text" per page
    private static final float OCR_DPI = 200f;

    private final GeminiChatService geminiChatService;

    public PdfProcessingService(GeminiChatService geminiChatService) {
        this.geminiChatService = geminiChatService;
    }

    /**
     * Extract text from a PDF.
     * 1. Try PDFBox text extraction (fast, for text-based PDFs)
     * 2. If text is too short → fallback to Gemini Vision OCR (for scanned PDFs)
     */
    public String extractText(byte[] pdfBytes) throws IOException {
        try (PDDocument document = Loader.loadPDF(pdfBytes)) {
            int pageCount = document.getNumberOfPages();
            log.info("Processing PDF: {} pages", pageCount);

            // Step 1: Try PDFBox text extraction
            PDFTextStripper stripper = new PDFTextStripper();
            String fullText = stripper.getText(document);

            if (fullText.strip().length() >= MIN_TEXT_LENGTH * pageCount) {
                log.info("PDFBox extracted {} chars (text-based PDF)", fullText.length());
                return fullText;
            }

            // Step 2: Fallback to Gemini Vision for scanned pages
            log.info("Text too short ({} chars), falling back to Gemini Vision OCR",
                    fullText.strip().length());
            return extractWithVision(document);
        }
    }

    private String extractWithVision(PDDocument document) throws IOException {
        PDFRenderer renderer = new PDFRenderer(document);
        List<String> pageTexts = new ArrayList<>();

        for (int i = 0; i < document.getNumberOfPages(); i++) {
            BufferedImage image = renderer.renderImageWithDPI(i, OCR_DPI);
            byte[] imageBytes = bufferedImageToPng(image);

            log.info("OCR page {}/{} via Gemini Vision ({} bytes)",
                    i + 1, document.getNumberOfPages(), imageBytes.length);

            try {
                String pageText = geminiChatService.extractTextFromImage(imageBytes, "image/png");
                if (!pageText.isBlank()) {
                    pageTexts.add(pageText);
                }
            } catch (Exception e) {
                log.error("OCR failed for page {}/{}: {}", i + 1, document.getNumberOfPages(), e.getMessage());
            }
        }

        return String.join("\n---\n", pageTexts);
    }

    private byte[] bufferedImageToPng(BufferedImage image) throws IOException {
        var baos = new ByteArrayOutputStream();
        ImageIO.write(image, "png", baos);
        return baos.toByteArray();
    }
}
