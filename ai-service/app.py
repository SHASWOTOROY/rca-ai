from flask import Flask, request, jsonify
from openai import OpenAI
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

@app.route('/analyze', methods=['POST'])
def analyze_error():
    data = request.json
    log_content = data.get('log_content', '')
    error_code = data.get('error_code', '')
    
    prompt = f"Analyze the following log content and error code for root cause analysis:\n\nLog: {log_content}\nError: {error_code}\n\nProvide a detailed analysis and potential solutions."
    
    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=1000
    )
    
    analysis = response.choices[0].message.content
    return jsonify({'analysis': analysis})

@app.route('/generate_report', methods=['POST'])
def generate_report():
    data = request.json
    analyses = data.get('analyses', [])
    
    prompt = f"Generate a comprehensive RCA report based on the following analyses:\n\n{analyses}\n\nProvide a structured report with root cause, impact, and resolution steps."
    
    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=1500
    )
    
    report = response.choices[0].message.content
    return jsonify({'report': report})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)