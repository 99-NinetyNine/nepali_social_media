"""
AI Job Matching System with Cosine Similarity
Matches candidates to jobs based on skills, experience, location, and salary preferences.
"""

import re
import math
from collections import Counter
from typing import List, Dict, Tuple, Any
from django.db.models import Q
from .models import Job, JobApplication, UserProfile


class JobMatcher:
    """AI-powered job matching using cosine similarity and weighted scoring"""
    
    # Common technical skills for normalization
    COMMON_SKILLS = [
        'python', 'java', 'javascript', 'react', 'django', 'spring', 'nodejs', 
        'angular', 'vue', 'html', 'css', 'sql', 'mysql', 'postgresql', 'mongodb',
        'aws', 'docker', 'kubernetes', 'git', 'linux', 'machine learning', 'ai',
        'data science', 'tensorflow', 'pytorch', 'pandas', 'numpy', 'flask',
        'express', 'rest api', 'graphql', 'microservices', 'devops', 'ci/cd',
        'jenkins', 'terraform', 'ansible', 'redis', 'elasticsearch', 'kafka',
        'rabbitmq', 'celery', 'nginx', 'apache', 'load balancing', 'caching'
    ]
    
    def __init__(self):
        self.skill_weights = {
            'exact_match': 1.0,
            'partial_match': 0.7,
            'related_match': 0.5
        }
        
    def normalize_text(self, text: str) -> str:
        """Normalize text for comparison"""
        if not text:
            return ""
        return re.sub(r'[^\w\s]', ' ', text.lower().strip())
    
    def extract_skills_from_text(self, text: str) -> List[str]:
        """Extract skills from job description or requirements"""
        normalized = self.normalize_text(text)
        found_skills = []
        
        for skill in self.COMMON_SKILLS:
            if skill in normalized:
                found_skills.append(skill)
        
        # Also extract other potential skills (words that appear technical)
        words = normalized.split()
        tech_patterns = [
            r'\w*js$',  # JavaScript frameworks
            r'\w*py$',  # Python related
            r'\w*sql$', # SQL variants
            r'\w+\+\+$', # C++, etc
        ]
        
        for word in words:
            for pattern in tech_patterns:
                if re.match(pattern, word) and word not in found_skills:
                    found_skills.append(word)
        
        return list(set(found_skills))
    
    def cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """Calculate cosine similarity between two vectors"""
        if not vec1 or not vec2:
            return 0.0
        
        dot_product = sum(a * b for a, b in zip(vec1, vec2))
        magnitude1 = math.sqrt(sum(a * a for a in vec1))
        magnitude2 = math.sqrt(sum(a * a for a in vec2))
        
        if magnitude1 == 0 or magnitude2 == 0:
            return 0.0
            
        return dot_product / (magnitude1 * magnitude2)
    
    def create_skill_vector(self, user_skills: List[str], job_skills: List[str]) -> Tuple[List[float], List[float]]:
        """Create skill vectors for cosine similarity calculation"""
        all_skills = list(set(user_skills + job_skills))
        
        if not all_skills:
            return [0], [0]
        
        user_vector = []
        job_vector = []
        
        for skill in all_skills:
            # User skill scoring
            user_score = 0.0
            for user_skill in user_skills:
                if skill == user_skill:
                    user_score = 1.0
                elif skill in user_skill or user_skill in skill:
                    user_score = max(user_score, 0.7)
            user_vector.append(user_score)
            
            # Job skill scoring  
            job_score = 1.0 if skill in job_skills else 0.0
            job_vector.append(job_score)
        
        return user_vector, job_vector
    
    def calculate_skills_match(self, user_profile: UserProfile, job: Job) -> float:
        """Calculate skills match score using cosine similarity"""
        user_skills = [skill.lower() for skill in user_profile.skills] if user_profile.skills else []
        job_requirements = self.extract_skills_from_text(job.requirements + " " + job.description)
        
        if not user_skills or not job_requirements:
            return 0.0
        
        user_vector, job_vector = self.create_skill_vector(user_skills, job_requirements)
        similarity = self.cosine_similarity(user_vector, job_vector)
        
        return min(similarity * 100, 100.0)  # Convert to percentage, cap at 100%
    
    def calculate_experience_match(self, user_profile: UserProfile, job: Job) -> float:
        """Calculate experience level match"""
        user_years = user_profile.get_current_experience_years()
        
        experience_mapping = {
            'entry': (0, 2),
            'mid': (2, 5), 
            'senior': (5, 10),
            'executive': (10, float('inf'))
        }
        
        if job.experience_level not in experience_mapping:
            return 50.0  # Default score
        
        min_exp, max_exp = experience_mapping[job.experience_level]
        
        if min_exp <= user_years <= max_exp:
            return 100.0
        elif user_years < min_exp:
            # Penalize under-qualified candidates
            gap = min_exp - user_years
            return max(0, 100 - (gap * 20))  # 20% penalty per year short
        else:
            # Slight penalty for over-qualified (might be overqualified concern)
            excess = user_years - max_exp
            return max(70, 100 - (excess * 5))  # 5% penalty per excess year, min 70%
    
    def calculate_location_match(self, user_profile: UserProfile, job: Job) -> float:
        """Calculate location compatibility"""
        user_locations = [loc.lower() for loc in user_profile.preferred_locations] if user_profile.preferred_locations else []
        job_location = job.location.lower()
        
        # Remote work preferences
        if job.is_remote:
            if user_profile.remote_work_preference in ['remote', 'hybrid', 'flexible']:
                return 100.0
            else:
                return 70.0  # Still possible but not preferred
        
        # Location-based matching
        if not user_locations:
            return 50.0  # No preference specified
        
        for user_loc in user_locations:
            if user_loc in job_location or job_location in user_loc:
                return 100.0
        
        # Check for same city/region (partial matches)
        for user_loc in user_locations:
            loc_parts = user_loc.split()
            job_parts = job_location.split()
            if any(part in job_parts for part in loc_parts if len(part) > 2):
                return 80.0
        
        return 20.0  # No location match
    
    def calculate_salary_match(self, user_profile: UserProfile, job: Job) -> float:
        """Calculate salary expectation compatibility"""
        if not user_profile.preferred_salary_min or not job.salary_max:
            return 75.0  # Neutral score when salary info is missing
        
        user_min = float(user_profile.preferred_salary_min)
        user_max = float(user_profile.preferred_salary_max or user_min * 1.5)
        job_min = float(job.salary_min or 0)
        job_max = float(job.salary_max)
        
        # Check for overlap in salary ranges
        overlap_start = max(user_min, job_min)
        overlap_end = min(user_max, job_max)
        
        if overlap_end >= overlap_start:
            # There's an overlap - calculate how good it is
            user_range = user_max - user_min
            overlap_size = overlap_end - overlap_start
            
            if user_range > 0:
                overlap_percentage = (overlap_size / user_range) * 100
                return min(100.0, 80.0 + overlap_percentage * 0.2)
            else:
                return 90.0
        else:
            # No overlap - check how far apart they are
            if user_min > job_max:
                # User expects more than job offers
                gap = (user_min - job_max) / job_max * 100
                return max(20, 80 - gap)  # Penalty based on gap percentage
            else:
                # Job offers more than user expects (good for user)
                return 95.0
    
    def calculate_overall_match(self, user_profile: UserProfile, job: Job) -> Dict[str, float]:
        """Calculate overall job match score with breakdown"""
        
        # Calculate individual scores
        skills_score = self.calculate_skills_match(user_profile, job)
        experience_score = self.calculate_experience_match(user_profile, job)
        location_score = self.calculate_location_match(user_profile, job)
        salary_score = self.calculate_salary_match(user_profile, job)
        
        # Weighted overall score
        weights = {
            'skills': 0.4,      # 40% - Most important
            'experience': 0.25, # 25% 
            'location': 0.2,    # 20%
            'salary': 0.15      # 15%
        }
        
        overall_score = (
            skills_score * weights['skills'] +
            experience_score * weights['experience'] +
            location_score * weights['location'] +
            salary_score * weights['salary']
        )
        
        return {
            'overall_score': round(overall_score, 1),
            'skills_score': round(skills_score, 1),
            'experience_score': round(experience_score, 1),
            'location_score': round(location_score, 1),
            'salary_score': round(salary_score, 1)
        }
    
    def get_job_recommendations(self, user_profile: UserProfile, limit: int = 10) -> List[Dict]:
        """Get top job recommendations for a user"""
        active_jobs = Job.objects.filter(is_active=True)
        
        # Exclude jobs user has already applied to
        applied_job_ids = JobApplication.objects.filter(
            applicant=user_profile.user
        ).values_list('job_id', flat=True)
        
        jobs = active_jobs.exclude(id__in=applied_job_ids)
        
        recommendations = []
        for job in jobs:
            match_scores = self.calculate_overall_match(user_profile, job)
            
            recommendations.append({
                'job': job,
                'match_score': match_scores['overall_score'],
                'skills_match': match_scores['skills_score'],
                'experience_match': match_scores['experience_score'],
                'location_match': match_scores['location_score'],
                'salary_match': match_scores['salary_score']
            })
        
        # Sort by match score descending
        recommendations.sort(key=lambda x: x['match_score'], reverse=True)
        
        return recommendations[:limit]
    
    def update_application_scores(self, application: JobApplication):
        """Update match scores for an existing application"""
        user_profile = application.applicant.profile
        job = application.job
        
        scores = self.calculate_overall_match(user_profile, job)
        
        application.match_score = scores['overall_score']
        application.skills_match_score = scores['skills_score']
        application.experience_match_score = scores['experience_score']
        application.location_match_score = scores['location_score']
        application.salary_match_score = scores['salary_score']
        
        application.save()
        
        return scores


# Global matcher instance
job_matcher = JobMatcher()