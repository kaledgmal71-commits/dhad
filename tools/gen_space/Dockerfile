# خادم توليد نواة المؤقت: نموذج مفتوح الأوزان (ALLaM-7B، Apache-2.0) بصيغة GGUF على llama.cpp، معالج فقط (مجاني).
FROM alpine AS dl
RUN apk add --no-cache curl
ARG REPO=bartowski/ALLaM-AI_ALLaM-7B-Instruct-preview-GGUF
ARG FILE=ALLaM-AI_ALLaM-7B-Instruct-preview-Q4_K_M.gguf
RUN curl -fL --retry 5 -o /m.gguf https://huggingface.co/${REPO}/resolve/main/${FILE}
FROM ghcr.io/ggml-org/llama.cpp:server
COPY --from=dl /m.gguf /models/m.gguf
EXPOSE 7860
ENTRYPOINT ["/app/llama-server"]
CMD ["-m","/models/m.gguf","--host","0.0.0.0","--port","7860","-c","4096","-t","2","--parallel","1","--jinja","--alias","nawa"]
