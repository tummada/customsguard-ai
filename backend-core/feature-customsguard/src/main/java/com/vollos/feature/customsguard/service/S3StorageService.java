package com.vollos.feature.customsguard.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Base64;

@Service
public class S3StorageService {

    private static final Logger log = LoggerFactory.getLogger(S3StorageService.class);

    private final String bucketName;
    private final String endpoint;
    private final String accessKeyId;
    private final String secretAccessKey;
    private final String region;

    public S3StorageService(
            @Value("${s3.bucket-name}") String bucketName,
            @Value("${s3.endpoint:}") String endpoint,
            @Value("${s3.access-key-id:}") String accessKeyId,
            @Value("${s3.secret-access-key:}") String secretAccessKey,
            @Value("${s3.region:auto}") String region) {
        this.bucketName = bucketName;
        this.endpoint = endpoint;
        this.accessKeyId = accessKeyId;
        this.secretAccessKey = secretAccessKey;
        this.region = region;
    }

    public String uploadPdf(byte[] data, String key) {
        // For development: log the upload intent
        // In production: use AWS SDK S3Client to upload
        log.info("Uploading PDF to S3: bucket={}, key={}, size={} bytes",
                bucketName, key, data.length);

        // TODO: Implement actual S3 upload with AWS SDK when S3 credentials are configured
        // S3Client s3 = S3Client.builder()
        //     .endpointOverride(URI.create(endpoint))
        //     .region(Region.of(region))
        //     .credentialsProvider(StaticCredentialsProvider.create(
        //         AwsBasicCredentials.create(accessKeyId, secretAccessKey)))
        //     .build();
        // s3.putObject(PutObjectRequest.builder().bucket(bucketName).key(key).build(),
        //     RequestBody.fromBytes(data));

        return key;
    }

    public byte[] downloadPdf(String key) {
        log.info("Downloading PDF from S3: bucket={}, key={}", bucketName, key);

        // TODO: Implement actual S3 download
        throw new UnsupportedOperationException("S3 download not yet implemented");
    }
}
